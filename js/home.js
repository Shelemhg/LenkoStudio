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

        // Preserve the previous UX intent:
        // - Mobile: default sound is OFF unless the user explicitly enabled it.
        //   In that case we skip the intro and show the page immediately.
        // - Desktop: default sound is ON unless the user explicitly disabled it.
        //   If they disabled it, we also skip the intro.
        const saved = localStorage.getItem('soundEnabled');
        const isMobile = window.innerWidth <= 768;
        const soundWasDisabled = isMobile ? (saved !== 'true') : (saved === 'false');

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
        if (prefersReducedMotion || soundWasDisabled) {
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
            title.addEventListener('click', completeIntro);
            title.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                }

                event.preventDefault();
                completeIntro();
            });
        }

        // Clicking anywhere in the hero (except CTA buttons) should continue.
        root.addEventListener(
            'click',
            (event) => {
                const clickedCTA = event.target && event.target.closest && event.target.closest('.hero-ctas');
                if (clickedCTA) {
                    return;
                }

                completeIntro();
            },
            { capture: true }
        );

        if (skipIntro) {
            skipIntro.addEventListener('click', () => {
                completeIntro();

                // Do NOT force-enable sound on skip.
                // Users can turn it on via the header toggle if they want.
            });
        }
    }

    // Public entry point for PJAX.
    window.HomeIntro = {
        init: () => initHomeIntro(document)
    };

    // Initial page load.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initHomeIntro(document));
    } else {
        initHomeIntro(document);
    }
})();
