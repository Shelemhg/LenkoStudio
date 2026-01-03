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

    /**
     * VIDEO LAZY LOADING: Defer video loading until browser is idle
     *
     * Performance strategy:
     * - Keeps initial page load fast by not blocking on video parsing
     * - Uses requestIdleCallback to wait for CPU idle time (1.5s max)
     * - Marks video as loaded to prevent duplicate source injection
     * - Mutes video to comply with autoplay policies across browsers
     */
    function ensureVideoLoaded(bgVideo) {
        // Idempotency check: don't load the same video twice
        if (!bgVideo || bgVideo.dataset.loaded) {
            return;
        }

        // Dynamically inject video source (not in HTML to avoid blocking parse)
        const source = document.createElement('source');
        source.src = 'media/oceanvideo.mp4';
        source.type = 'video/mp4';

        bgVideo.appendChild(source);
        bgVideo.dataset.loaded = '1';
        bgVideo.muted = true;  // Required for autoplay to work

        // Attempt autoplay (browsers may block, handled gracefully)
        const playPromise = bgVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Autoplay can be blocked by browser policy; this is expected
                // and acceptable (user can still interact to start playback).
            });
        }
    }

    /**
     * STATE MACHINE: Controls the cinematic intro progression
     *
     * Stage 0: Black overlay fully visible, title clickable but not yet revealed
     *          (Initial state when page loads with sound enabled)
     *
     * Stage 1: [Currently unused, reserved for future fade-in animations]
     *
     * Stage 2: Black overlay fades out, gallery becomes visible, intro complete
     *          (Final state after user interaction or immediate skip)
     *
     * Transitions:
     * - Sound ON:  0 → 2 (on user click/enter)
     * - Sound OFF: 0 → 2 (immediate, no black screen flash)
     */
    function setStage(rootBody, blackOverlay, stage, options = {}) {
        if (!rootBody) {
            return;
        }

        // Remove all stage classes and apply the new one
        rootBody.classList.remove('stage-0', 'stage-1', 'stage-2');
        rootBody.classList.add(`stage-${stage}`);

        if (stage === 2 && blackOverlay) {
            // SOUND OFF BEHAVIOR: When user has explicitly disabled sound,
            // we skip the black overlay entirely to avoid a jarring flash.
            // This respects the user's preference for a "fast, no intro" experience.
            if (options.immediateOverlayHide) {
                // STYLE FLUSH TECHNIQUE: Disable transitions temporarily to hide
                // the overlay instantly (no fade animation).
                const prevTransition = blackOverlay.style.transition;
                blackOverlay.style.transition = 'none';
                blackOverlay.classList.add('is-hidden');

                // Force browser to apply the style change immediately by reading
                // a layout property (offsetHeight). This ensures the overlay is
                // truly hidden before the next paint.
                // eslint-disable-next-line no-unused-expressions
                blackOverlay.offsetHeight;

                // Restore the transition property in the next animation frame
                // so future navigations can animate properly.
                window.requestAnimationFrame(() => {
                    blackOverlay.style.transition = prevTransition;
                });
                return;
            }

            // SOUND ON BEHAVIOR: Normal fade-out transition via CSS
            blackOverlay.classList.add('is-hidden');
        }
    }

    function initHomeIntro(root) {
        if (!isHomePage(root)) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const { body, blackOverlay, bgVideo, title, skipIntro } = getElements(root);

        // INTRO BEHAVIOR PHILOSOPHY:
        // - Always show the cinematic intro on both mobile and desktop for a premium feel.
        // - Do NOT auto-skip for `prefers-reduced-motion` because:
        //   * MOBILE BATTERY SAVER: Phones automatically enable reduced motion in
        //     battery saver mode, which would make the intro "disappear" unintentionally.
        //   * The intro is user-initiated (click/tap to continue), not auto-playing,
        //     so it respects the spirit of reduced motion without breaking the UX.
        // - WHY SOUND PREFERENCE DRIVES BEHAVIOR: If user explicitly disabled sound,
        //   they've signaled they want a "fast, no frills" experience. We honor this
        //   by skipping the black overlay entirely on subsequent page loads.

        // Idempotency check: prevent double-initialization under PJAX navigation
        if (body && body.dataset.homeIntroBound === 'true') {
            return;
        }
        if (body) {
            body.dataset.homeIntroBound = 'true';
        }

        // STATE MACHINE INITIALIZATION: Start at stage 0 (black overlay visible)
        setStage(body, blackOverlay, 0);

        // SOUND PREFERENCE CHECK: Read localStorage directly (home.js loads before app.js)
        // If sound is OFF, user wants a fast experience - skip intro immediately.
        // WHY IMMEDIATE HIDE: Prevents the black overlay from flashing for even
        // a single frame, which would feel janky. The gallery appears instantly.
        const soundPref = storageGet('soundEnabled');
        if (soundPref === 'false') {
            setStage(body, blackOverlay, 2, { immediateOverlayHide: true });
            ensureVideoLoaded(bgVideo);  // Still load video for ambient background
            return;  // Exit early, no event listeners needed
        }

        // PERFORMANCE OPTIMIZATION: Lazy load video during browser idle time
        // requestIdleCallback waits for CPU to be free (max 1.5s timeout)
        // Fallback to setTimeout for Safari and older browsers
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => ensureVideoLoaded(bgVideo), { timeout: 1500 });
        } else {
            setTimeout(() => ensureVideoLoaded(bgVideo), 500);
        }

        // Guard flag to prevent multiple completions (e.g., double-click)
        let completed = false;

        // EVENT LISTENER CLEANUP FOR PJAX:
        // Store all handler references so destroy() can properly remove them.
        // This prevents memory leaks and duplicate bindings when navigating
        // away and back to the home page with PJAX.
        const state = {
            onTitleClick: null,
            onTitleKeydown: null,
            onRootClickCapture: null,
            onSkipClick: null
        };

        /**
         * Complete the intro sequence and transition to stage 2
         *
         * Responsibilities:
         * 1. Transition state machine to stage 2 (fade out black overlay)
         * 2. Ensure background video is loaded and playing
         * 3. Enable ambient audio if user preference allows
         */
        function completeIntro() {
            if (completed) {
                return;  // Prevent double-execution from multiple events
            }

            completed = true;

            // STATE TRANSITION: Move to final stage
            setStage(body, blackOverlay, 2);
            ensureVideoLoaded(bgVideo);

            // AUDIO CONTROLLER INTEGRATION:
            // app.js owns the audio preference and <audio> element.
            // We only enable audio if the user's preference allows it.
            // This respects their choice while still allowing the intro to complete.
            const audioController = window.Lenko && window.Lenko.audio;
            if (audioController && audioController.getEnabled()) {
                audioController.enable(true);
            }

            // MOBILE MEDIA CONFLICT FIX:
            // Some mobile browsers (especially iOS) pause one media element when
            // another starts playing. Explicitly resume the background video to
            // prevent it from stopping when ambient audio begins.
            if (bgVideo && typeof bgVideo.play === 'function') {
                const p = bgVideo.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(() => {
                        // Silently ignore autoplay policy blocks or iOS quirks
                    });
                }
            }
        }

        // TITLE INTERACTION:
        // WHY TITLE IS CLICKABLE: Provides a clear, centered focal point for
        // interaction. Users naturally expect to click the title to "enter" the site.
        // This is more intuitive than hunting for a tiny "Skip" button.
        //
        // KEYBOARD ACCESSIBILITY: Support Enter and Space keys for screen readers
        // and keyboard-only navigation. Makes the intro fully accessible to users
        // who cannot or prefer not to use a mouse.
        if (title) {
            state.onTitleClick = completeIntro;
            state.onTitleKeydown = (event) => {
                // Only respond to Enter and Space (standard button activation keys)
                if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                }

                event.preventDefault();  // Prevent page scroll on Space
                completeIntro();
            };

            title.addEventListener('click', state.onTitleClick);
            title.addEventListener('keydown', state.onTitleKeydown);
        }

        // CLICK-ANYWHERE TO CONTINUE:
        // Uses capture phase to intercept clicks before they reach other handlers.
        // Provides maximum interaction area - users can click anywhere to proceed.
        // Exception: CTA buttons in the hero should navigate normally, not skip intro.
        state.onRootClickCapture = (event) => {
                // Check if click target is inside a CTA button group
                const clickedCTA = event.target && event.target.closest && event.target.closest('.hero-ctas');
                if (clickedCTA) {
                    return;  // Let CTA clicks through to their normal handlers
                }

                completeIntro();
            };

        // Capture phase ensures this runs before any child element handlers
        root.addEventListener('click', state.onRootClickCapture, { capture: true });

        // SKIP INTRO FUNCTIONALITY:
        // Provides an explicit "Skip" button for users who want to bypass the intro.
        // Useful for returning visitors or users in a hurry.
        if (skipIntro) {
            state.onSkipClick = () => {
                completeIntro();

                // IMPORTANT: Do NOT force-enable sound when skipping.
                // Skip implies "I want the fast experience" - respect that intent.
                // Users can manually enable sound via the header toggle if desired.
            };

            skipIntro.addEventListener('click', state.onSkipClick);
        }

        // Expose destroy for PJAX.
        window.HomeIntro._state = state;
    }

    // PUBLIC API FOR PJAX INTEGRATION:
    // init() - Call when navigating to home page
    // destroy() - Call when navigating away to clean up event listeners
    window.HomeIntro = {
        init: () => initHomeIntro(document),

        /**
         * EVENT LISTENER CLEANUP FOR PJAX:
         *
         * Critical for single-page app navigation. Without cleanup:
         * - Memory leaks from orphaned event listeners
         * - Duplicate handlers firing on return navigation
         * - Stale references to removed DOM elements
         *
         * Wrapped in try-catch because elements may not exist if navigation
         * happened before intro completed, or if DOM was modified externally.
         */
        destroy: () => {
            const root = document;
            const body = root.body;
            const title = root.getElementById('introTitle');
            const skipIntro = root.getElementById('skipIntro');
            const state = window.HomeIntro && window.HomeIntro._state;

            // Remove capture-phase click handler from document root
            try {
                if (state && state.onRootClickCapture) {
                    root.removeEventListener('click', state.onRootClickCapture, { capture: true });
                }
            } catch {
                // Element may have been removed already
            }

            // Remove title interaction handlers (click + keyboard)
            try {
                if (title && state && state.onTitleClick) {
                    title.removeEventListener('click', state.onTitleClick);
                }
                if (title && state && state.onTitleKeydown) {
                    title.removeEventListener('keydown', state.onTitleKeydown);
                }
            } catch {
                // Element may have been removed already
            }

            // Remove skip button handler
            try {
                if (skipIntro && state && state.onSkipClick) {
                    skipIntro.removeEventListener('click', state.onSkipClick);
                }
            } catch {
                // Element may have been removed already
            }

            // Clear initialization flag so re-init works on return navigation
            if (body) {
                delete body.dataset.homeIntroBound;
            }

            // Clear state object to allow garbage collection
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
