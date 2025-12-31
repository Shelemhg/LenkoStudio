/**
 * Home Intro Controller
 *
 * Handles the index.html “cinematic intro” state machine.
 *
 * Design goals:
 * - Keep the home page feeling instant.
 * - Respect `prefers-reduced-motion`.
 * - Never force-enable audio; defer to the user preference managed by app.js.
 */

(function () {
    'use strict';

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    /**
     * Home pages are identified by `main.home`.
     * This prevents the controller from running on other pages after PJAX navigation.
     */
    function isHomePage(root) {
        return Boolean(root && root.querySelector && root.querySelector('main.home'));
    }

    function getElements(root) {
        return {
            body: root.body,
            blackOverlay: root.getElementById('blackOverlay'),
            bgVideo: root.getElementById('bgVideo'),
            title: root.getElementById('introTitle'),
            skipIntro: root.getElementById('skipIntro')
        };
    }

    function ensureVideoLoaded(bgVideo) {
        if (!bgVideo || bgVideo.dataset.loaded) {
            return;
        }

        const source = document.createElement('source');
        source.src = 'media/oceanvideo.mp4';
        source.type = 'video/mp4';

        bgVideo.appendChild(source);
        bgVideo.dataset.loaded = '1';
        bgVideo.muted = true;

        const playPromise = bgVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Autoplay can be blocked; that is expected.
            });
        }
    }

    function setStage(rootBody, blackOverlay, stage) {
        if (!rootBody) {
            return;
        }

        rootBody.classList.remove('stage-0', 'stage-1', 'stage-2');
        rootBody.classList.add(`stage-${stage}`);

        if (stage === 2 && blackOverlay) {
            blackOverlay.classList.add('is-hidden');
        }
    }

    function initHomeIntro(root) {
        if (!isHomePage(root)) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const { body, blackOverlay, bgVideo, title, skipIntro } = getElements(root);

        // Simplified behavior:
        // - Always show the cinematic intro on both mobile and desktop.
        // - Only `prefers-reduced-motion` skips the intro.

        // Idempotency: do not bind twice.
        if (body && body.dataset.homeIntroBound === 'true') {
            return;
        }
        if (body) {
            body.dataset.homeIntroBound = 'true';
        }

        // Default state: show the cinematic intro overlay.
        setStage(body, blackOverlay, 0);

        // Reduced-motion users should not have to "play" the intro.
        if (prefersReducedMotion) {
            setStage(body, blackOverlay, 2);
            ensureVideoLoaded(bgVideo);
            return;
        }

        // Load video when the browser is idle (keeps initial show fast).
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => ensureVideoLoaded(bgVideo), { timeout: 1500 });
        } else {
            setTimeout(() => ensureVideoLoaded(bgVideo), 500);
        }

        let completed = false;

        // Keep handler references so we can remove them under PJAX.
        const state = {
            onTitleClick: null,
            onTitleKeydown: null,
            onRootClickCapture: null,
            onSkipClick: null
        };

        function completeIntro() {
            if (completed) {
                return;
            }

            completed = true;

            setStage(body, blackOverlay, 2);
            ensureVideoLoaded(bgVideo);

            // Only enable audio if the user preference is enabled.
            // app.js owns the preference and the audio element.
            const audioController = window.Lenko && window.Lenko.audio;
            if (audioController && audioController.getEnabled()) {
                audioController.enable(true);
            }
        }

        if (title) {
            state.onTitleClick = completeIntro;
            state.onTitleKeydown = (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                }

                event.preventDefault();
                completeIntro();
            };

            title.addEventListener('click', state.onTitleClick);
            title.addEventListener('keydown', state.onTitleKeydown);
        }

        // Clicking anywhere in the hero (except CTA buttons) should continue.
        state.onRootClickCapture = (event) => {
                const clickedCTA = event.target && event.target.closest && event.target.closest('.hero-ctas');
                if (clickedCTA) {
                    return;
                }

                completeIntro();
            };

        root.addEventListener('click', state.onRootClickCapture, { capture: true });

        if (skipIntro) {
            state.onSkipClick = () => {
                completeIntro();

                // Do NOT force-enable sound on skip.
                // Users can turn it on via the header toggle if they want.
            };

            skipIntro.addEventListener('click', state.onSkipClick);
        }

        // Expose destroy for PJAX.
        window.HomeIntro._state = state;
    }

    // Public entry point for PJAX.
    window.HomeIntro = {
        init: () => initHomeIntro(document),
        destroy: () => {
            const root = document;
            const body = root.body;
            const title = root.getElementById('introTitle');
            const skipIntro = root.getElementById('skipIntro');
            const state = window.HomeIntro && window.HomeIntro._state;

            try {
                if (state && state.onRootClickCapture) {
                    root.removeEventListener('click', state.onRootClickCapture, { capture: true });
                }
            } catch {
                // ignore
            }

            try {
                if (title && state && state.onTitleClick) {
                    title.removeEventListener('click', state.onTitleClick);
                }
                if (title && state && state.onTitleKeydown) {
                    title.removeEventListener('keydown', state.onTitleKeydown);
                }
            } catch {
                // ignore
            }

            try {
                if (skipIntro && state && state.onSkipClick) {
                    skipIntro.removeEventListener('click', state.onSkipClick);
                }
            } catch {
                // ignore
            }

            if (body) {
                delete body.dataset.homeIntroBound;
            }

            delete window.HomeIntro._state;
        }
    };

    // Initial page load.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initHomeIntro(document));
    } else {
        initHomeIntro(document);
    }
})();
