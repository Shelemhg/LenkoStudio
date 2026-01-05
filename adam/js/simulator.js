// ============================================================================
// SIMULATOR.JS: Creator Growth Decision Simulator
// ============================================================================
//
// PURPOSE:
//     Interactive simulator that models a social media creator's growth journey.
//     Users make strategic decisions (content type, posting schedule, monetization)
//     and see how each choice impacts followers, views, engagement, and income.
//
// KEY FEATURES:
//     1. Multi-Chapter Story
//        - Each chapter presents a growth decision
//        - Choices have different tradeoffs (engagement vs income, time vs quality)
//        - Outcomes are influenced by account size (exponential scaling)
//
//     2. Dynamic Scaling System
//        - Same decision has different impact at 1K vs 100K followers
//        - Uses exponential multipliers: (followers/35000)^0.57
//        - Ensures meaningful growth at any account size
//        - Prevents tiny % changes at small scale or unrealistic growth at large scale
//
//     3. Metrics Tracked
//        - Followers (social reach)
//        - Views (content performance)
//        - Engagement rate (audience quality)
//        - Monthly income (monetization success)
//        - Monthly costs (business expenses)
//        - Subscribers (premium tier fans)
//
//     4. Visual Feedback
//        - Animated line chart showing follower growth over time
//        - Decision table with impact breakdown per choice
//        - Real-time preview on hover (shows potential outcome)
//        - Smooth number animations (avoid jarring updates)
//        - Mobile-optimized (skips animations on small screens)
//
// WHY THIS DESIGN?
//     - Educational: Shows creators how decisions compound over time
//     - Realistic: Growth is non-linear, costs increase with scale
//     - Engaging: Immediate visual feedback keeps users invested
//     - Replayable: Different starting points yield different strategies
//
// DATA SOURCE:
//     - simulator.csv: Contains all decision scenarios, choices, and effects
//     - Falls back to embedded data if CSV fails to load
//
// SCALING FORMULA EXPLAINED:
//     Base multiplier = (followers / 35000) ^ 0.57
//     
//     WHY 35000?
//     - Middle-tier creator baseline (mid-size influencer)
//     - Makes math human-readable at common account sizes
//     
//     WHY 0.57 exponent?
//     - Balances realistic growth (not too fast at small scale)
//     - Ensures meaningful absolute numbers at large scale
//     - Tuned through testing to feel "right" across 1K-1M followers
//
// USAGE:
//     1. User sets starting follower count
//     2. Clicks "Start Simulation"
//     3. Makes choices chapter by chapter
//     4. Sees follower graph update after each decision
//     5. Can restart with different strategy
//
// DEPENDENCIES:
//     - Chart.js (line chart rendering)
//     - data/simulator.csv (decision scenarios)
//     - CSS: simulator.css
//
// ============================================================================

(function () {
    'use strict';


    // ========================================================================
    // CREATOR SIMULATOR CLASS
    // ========================================================================

    class CreatorSimulator {
        constructor() {
            // Data loaded from CSV
            this.chapters = [];

            // User's chosen starting point
            this.userStartingFollowers = 1000;

            // Initial metrics state
            this.initialState = {
                followers: 1000,
                views: 5000,
                engagement: 5,
                income: 0,
                subscribers: 0,
                costs: [], // Array of {name, val} cost items
                historyByStep: [1000] // Follower count at each step (for chart)
            };
            
            // Current simulation state (mutates as user makes choices)
            this.state = { ...this.initialState };

            // User's choice selections (one per chapter)
            this.choices = [];

            // Preview data for hover effects (shows potential outcome)
            this.previewData = null;

            // Animation state tracking
            this._pendingChartAnim = null; // { fromStep, toStep }
            this._pendingHighlightChapter = null; // Which chapter is animating
            this._pendingDecisionAnim = null; // { chapterIndex, from, to }
            
            // Cached DOM elements (populated by cacheElements())
            this.els = {};
        }

        /**
         * Get Last Answered Step
         * 
         * WHY needed?
         * - Chart animation needs to know how far along user is
         * - Decision table needs to show only answered chapters
         * - Determines which chapter to display next
         * 
         * @returns {number} Step index (0 = no choices made, max = all answered)
         */
        getLastAnsweredStep() {
            const totalChapters = this.chapters.length - 1;
            let lastAnsweredStep = 0;

            for (let i = 0; i < totalChapters; i++) {
                if (this.choices[i] !== null) {
                    lastAnsweredStep = i + 1;
                }
            }

            return lastAnsweredStep;
        }

        /**
         * Clone Current Totals Snapshot
         * 
         * Creates immutable snapshot of current state for comparison.
         * Used to calculate deltas when animating decision impacts.
         * 
         * @returns {Object} Snapshot with all key metrics
         */
        cloneTotalsSnapshot() {
            return {
                followers: this.state.followers,
                views: this.state.views,
                subscribers: this.state.subscribers,
                income: this.state.income,
                cost: this.getCurrentMonthlyCost()
            };
        }

        /**
         * Animate Decision Row Numbers
         * 
         * WHY animate?
         * - Makes impact of choice visually clear
         * - Smooth transitions feel premium and professional
         * - Draws eye to what changed
         * 
         * WHY skip on mobile?
         * - Slower devices may lag
         * - Small screens don't benefit from animation as much
         * - Instant updates feel snappier on mobile
         * 
         * @param {Object} anim - Animation config {chapterIndex, from, to}
         * @param {Function} done - Callback when animation completes
         */
        animateDecisionRow(anim, done) {
            // Skip animation on mobile (< 600px)
            if (window.innerWidth < 600) {
                done?.();
                return;
            }

            const tbody = this.els.aspectTableBody;
            if (!tbody || !anim) {
                done?.();
                return;
            }

            const row = tbody.querySelector(`tr.decision-row[data-chapter-index="${anim.chapterIndex}"]`);
            if (!row) {
                done?.();
                return;
            }

            const cells = row.querySelectorAll('td');
            if (!cells || cells.length < 6) {
                done?.();
                return;
            }

            const duration = 950; // Longer duration for smoother feel
            const start = performance.now();
            const from = anim.from;
            const to = anim.to;

            // Format helpers: add space between number and unit for readability
            const fmtSignedCompactSpaced = (n) => this.formatSignedCompact(Math.round(n)).replace(/(\d)([KMB])/g, '$1 $2');
            const fmtSignedMoneySpaced = (n) => this.formatSignedMoney(Math.round(n)).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2');

            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1 - t, 3); // Cubic ease-out (smooth deceleration)
                const lerp = (a, b) => a + (b - a) * ease;

                // Interpolate all metrics
                const followers = lerp(from.followersDelta, to.followersDelta);
                const views = lerp(from.viewsDelta, to.viewsDelta);
                const subscribers = lerp(from.subscribersDelta, to.subscribersDelta);
                const cost = lerp(from.costDelta, to.costDelta);
                const income = lerp(from.incomeDelta, to.incomeDelta);

                // Update cell text content with interpolated values
                cells[1].textContent = fmtSignedCompactSpaced(followers);
                cells[2].textContent = fmtSignedCompactSpaced(views);
                cells[3].textContent = fmtSignedCompactSpaced(subscribers);
                cells[4].textContent = fmtSignedMoneySpaced(cost);
                cells[5].textContent = fmtSignedMoneySpaced(income);

                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    done?.();
                }
            };

            requestAnimationFrame(step);
        }

        /**
         * Apply Delayed Highlights
         * 
         * WHY delay?
         * - Number animations need to complete before highlighting
         * - Prevents visual conflict (animating numbers + color change)
         * - Creates clear "animate then highlight" sequence
         * 
         * Works with data-final-class attribute set during row creation.
         */
        applyDelayedHighlights() {
            const tbody = this.els.aspectTableBody;
            if (!tbody) {
                return;
            }

            const delayed = tbody.querySelectorAll('[data-final-class]');

            delayed.forEach((el) => {
                const cls = el.getAttribute('data-final-class');
                if (cls) {
                    el.classList.add(cls);
                }
                el.removeAttribute('data-final-class');
            });
        }

        /**
         * Get Growth Multiplier for Account Size
         * 
         * CORE SCALING LOGIC:
         * Same decision should have different absolute impact based on
         * account size. Growing from 1K to 2K is 100% growth, but growing
         * from 100K to 101K is only 1% and feels insignificant.
         * 
         * This multiplier scales effects exponentially so:
         * - Small accounts see meaningful % growth
         * - Large accounts see meaningful absolute numbers
         * - Growth always feels impactful
         * 
         * FORMULA:
         * multiplier = (followers / 35000) ^ 0.57
         * 
         * TUNING:
         * - Exponent 0.57 was empirically tested across 1K-1M followers
         * - 35000 baseline represents mid-tier creator (good reference point)
         * - Clamps to 0.1x-500x to prevent extremes
         * 
         * @param {number} baseFollowers - Current follower count
         * @returns {number} Scaling multiplier (0.1 to 500)
         */
        getGrowthMultiplier(baseFollowers) {
            // Balanced exponential scaling: reasonable % growth at small scale, meaningful absolute at large scale
            const followers = Math.max(baseFollowers, 1000);
            const multiplier = Math.pow(followers / 35000, 0.57);
            
            // Clamp to reasonable bounds (minimum 0.1x for very small accounts)
            return Math.max(0.1, Math.min(500.0, multiplier));
        }

        /**
         * Get Percentage Dampening Multiplier
         * 
         * Companion to getGrowthMultiplier. Used when effects are defined
         * as percentages of followers. Dampens % impact as account grows.
         * 
         * FORMULA:
         * multiplier = (35000 / followers) ^ 0.43
         * 
         * WHY needed?
         * When combining Pct * Followers * Multiplier, this ensures
         * the result matches the old Base * (F/35k)^0.57 formula.
         * 
         * @param {number} baseFollowers - Current follower count
         * @returns {number} Dampening multiplier
         */
        getPercentMultiplier(baseFollowers) {
            // Dampening factor for percentages as account grows
            // Formula: (35000 / followers)^0.43
            const followers = Math.max(baseFollowers, 1000);
            const multiplier = Math.pow(35000 / followers, 0.43);
            return multiplier;
        }

        /**
         * Scale Effect Based on Account Size
         * 
         * Takes a raw effect definition (from CSV) and scales all metrics
         * based on current follower count using growth multipliers.
         * 
         * Also scales costs - larger accounts pay more for the same services
         * (reflects real-world: enterprise pricing, premium tools, etc.)
         * 
         * @param {Object} effect - Raw effect from CSV
         * @param {number} currentFollowers - Current follower count
         * @returns {Object} Scaled effect with absolute numbers
         */
        scaleEffect(effect, currentFollowers) {
            const absMultiplier = this.getGrowthMultiplier(currentFollowers);
            const pctMultiplier = this.getPercentMultiplier(currentFollowers);
            
            // Scale costs with account size too - larger accounts pay more for services
            const scaledCosts = effect.costs ? effect.costs.map(cost => ({
                name: cost.name,
                val: Math.round(cost.val * absMultiplier)
            })) : [];
            
            return {
                followers: Math.round(currentFollowers * effect.followersPct * pctMultiplier),
                views: Math.round(currentFollowers * effect.viewsPct * pctMultiplier),
                engagement: effect.engagement, // Keep engagement as-is (points, not scaled)
                income: Math.round(currentFollowers * effect.incomePct * pctMultiplier),
                subscribers: Math.round(currentFollowers * effect.subscribersPct * pctMultiplier),
                costs: scaledCosts
            };
        }

        /**
         * Initialize Simulator
         * 
         * Entry point. Called on page load. Sets up DOM references,
         * loads chapter data, binds event handlers, and renders initial UI.
         */
        async init() {
            this.cacheElements();
            await this.loadData();
            this.bindEvents();
            
            if (this.els.container) {
                this.updateDashboard();
            }

            // Bind follower input validation
            const followerInput = document.getElementById('startingFollowers');
            const startBtn = document.getElementById('startSimBtn');

            if (followerInput && startBtn) {
                followerInput.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);

                    // Minimum 100 followers required to start
                    if (value >= 100) {
                        startBtn.disabled = false;
                    } else {
                        startBtn.disabled = true;
                    }
                });
            }
        }

        /**
         * Load Chapter Data
         * 
         * WHY fetch() instead of hardcoding?
         * - Easier to update scenarios without touching code
         * - Non-technical team members can edit CSV
         * - Falls back to embedded data if network fails
         * 
         * @returns {Promise<void>}
         */
        async loadData() {
            try {
                const response = await fetch('data/simulator.csv');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                const rows = this.parseCSV(text);
                this.processChapters(rows);
                console.log("Chapters loaded via fetch:", this.chapters.length);
            } catch (e) {
                console.warn("Failed to load chapters via fetch, using fallback data.", e);
                const text = this.getFallbackData();
                const rows = this.parseCSV(text);
                this.processChapters(rows);
                console.log("Chapters loaded via fallback:", this.chapters.length);
            }
        }

        getFallbackData() {
            return `Step,Variation,Type,Title,Text,Followers,Views,Engagement,Income,Subscribers,CostName,CostVal,Explanation
1,profile_conversion_a,Question,The 10‑Second Profile Audit,"You’re getting views, but the follow button isn’t moving. When someone taps your profile, do they understand who you are and what you deliver in under 10 seconds?",0.000000,0.000000,,0.000000,0.000000,,,
1,profile_conversion_a,Choice,Focused creator identity shoot,A short professional session for profile photo + thumbnails + a few hero images. The goal isn’t ‘luxury’—it’s instant clarity and consistency across your profile.,0.050000,0.250000,3,0.001800,0.000600,Branding Mini-Session,-250,Best when your content already earns views but your profile looks ‘drafty’. The conversion lift can compound for months.
1,profile_conversion_a,Choice,Clarity refresh with what you have,"You tighten your bio promise, pin a “Start here” video, and rebuild thumbnails with a simple repeatable style. Costs time, but it keeps you authentic and fast to iterate.",0.035000,0.180000,1,0.001200,0.000400,Time & Effort,0,Best when your niche is still evolving. You gain clarity without spending money; you pay in time and iteration.
1,profile_conversion_b,Question,Pinned Video Problem,"People land on your page… then bounce. Are your pinned videos and visuals making the right first impression, or are they leaking attention?",0.000000,0.000000,,0.000000,0.000000,,,
1,profile_conversion_b,Choice,Portrait + thumbnail system day,You shoot a cohesive portrait set and a thumbnail system with proper lighting and framing so your profile reads ‘clear’ at a glance.,0.053000,0.280000,3,0.001800,0.000600,Portrait + Thumbnail System,-320,Best when your positioning is already clear. It reduces doubt for new viewers and improves follow-through.
1,profile_conversion_b,Choice,DIY pinned intro + thumbnail system,You script a 12‑second pinned intro and batch-shoot 10 consistent thumbnails with phone + window light. No cost—just discipline.,0.034000,0.180000,1,0.001200,0.000400,Time & Effort,0,"Strong move if you can keep consistency. Small lift, great ROI on time when budgets are tight."
1,profile_conversion_c,Question,Grid Trust Check,"If your profile were a storefront, would people walk in? Your grid and thumbnails signal trust before your best video ever plays.",0.000000,0.000000,,0.000000,0.000000,,,
1,profile_conversion_c,Choice,Creator storefront refresh,"You build a clean ‘creator storefront’: profile portrait, banner/pinned frame, and thumbnail style that reads instantly on mobile.",0.050000,0.250000,3,0.001800,0.000600,Storefront Refresh Session,-280,Most useful when your videos already attract taps. This improves what happens after the tap.
1,profile_conversion_c,Choice,One-hour consistency batch,You create one repeatable DIY lighting spot and shoot 12 consistent thumbnails in one hour. Not fancy—just less visual noise.,0.035000,0.180000,1,0.001200,0.000400,Time & Effort,0,"Works when you can keep the system going. This is a discipline play, not a money play."
2,hook_retention_a,Question,The First 3 Seconds,"Your ideas are solid, but viewers swipe early. Do you earn the next 3 seconds after the first 3?",0.000000,0.000000,,0.000000,0.000000,,,
2,hook_retention_a,Choice,Hook-first edit pass,"A professional edit pass tightens pacing, adds clean captions, and makes the opening land faster. Requires a clear brief.",0.057000,0.400000,4,0.002400,0.000800,Editing Pass,-220,Best when you have good footage but weak structure. Higher lift *only* if direction is clear.
2,hook_retention_a,Choice,Hook rewrite + cut dead time,You test 3 hook scripts and cut the first 1–2 seconds of filler. No spend—just fast learning.,0.045000,0.300000,1,0.001600,0.000500,Time & Effort,0,Often the highest ROI early: clarity + pacing. You improve retention without changing who you are.
2,hook_retention_b,Question,Retention Leak,"You get clicks, then watch time collapses. Your first 6 seconds decide whether anything else matters.",0.000000,0.000000,,0.000000,0.000000,,,
2,hook_retention_b,Choice,Caption + audio polish,A minimal pro upgrade: audio leveling + captions + a tighter opening cut. Keep it repeatable.,0.057000,0.400000,4,0.002400,0.000800,Caption + Audio Polish,-120,Worth it if viewers complain about clarity/audio. Keep it minimal so it doesn’t slow you down.
2,hook_retention_b,Choice,"Film tighter, say the payoff first",You re-shoot with a tighter frame and state the payoff immediately. You trade perfection for clarity.,0.045000,0.300000,1,0.001600,0.000500,Time & Effort,0,Clarity-first usually beats fancy production at this stage. Great when you can iterate quickly.
2,hook_retention_c,Question,Your Best Ideas Are Hidden,"People would love your point—if they reached it. Are you starting with the value, or making viewers wait?",0.000000,0.000000,,0.000000,0.000000,,,
2,hook_retention_c,Choice,Template edit pack,A pro editor restructures three videos into reusable templates you can follow later. This is a systems play.,0.060000,0.430000,4,0.002400,0.000800,Template Edit Pack,-260,High leverage if you reuse the structure for weeks. Wasteful if you go back to random edits.
2,hook_retention_c,Choice,"Conclusion first, explanation after","You flip the structure: conclusion first, then the ‘how/why’. No cost, faster learning.",0.045000,0.300000,2,0.001600,0.000500,Time & Effort,0,Maximizes learning speed and makes content instantly understandable—especially in short-form.
3,series_system_a,Question,Random vs Repeatable,Your posts perform inconsistently. Do you have a series people recognize—or are you reinventing every post?,0.000000,0.000000,,0.000000,0.000000,,,
3,series_system_a,Choice,Run one controlled experiment,"You keep one constant (format) and test one variable (hook, length, topic) per week. Cleaner learning, less chaos.",0.050000,0.320000,3,0.002400,0.000700,Time & Effort,0,Faster learning without confusing the audience. Great if you’re unsure what’s driving results.
3,series_system_a,Choice,Launch a weekly series,"You name the series, define a repeatable structure, and commit to one format for 4 weeks. Recognition beats novelty.",0.054000,0.320000,1,0.002600,0.000800,Time & Effort,0,Reduces volatility and builds return viewers. This is a strategic unlock with zero spend.
3,series_system_b,Question,The Signature Question,"If someone saw three of your posts, would they describe a clear signature—or just ‘random creator stuff’?",0.000000,0.000000,,0.000000,0.000000,,,
3,series_system_b,Choice,Build a simple format checklist,You create a one-page checklist: hook → proof → payoff → CTA. You use it every post for 2 weeks.,0.046000,0.290000,3,0.002400,0.000700,Time & Effort,0,Reduces cognitive load and improves clarity. Best when you’re inconsistent under time pressure.
3,series_system_b,Choice,Pick one signature angle,"Same promise, same framing, same cadence. You trade novelty for recognizability.",0.054000,0.320000,1,0.002600,0.000800,Time & Effort,0,Recognizability is a growth accelerant. Consistency often matters more than ‘better’ production.
3,series_system_c,Question,Experimentation Without Chaos,"You want to experiment, but your page feels inconsistent. How do you test without losing trust?",0.000000,0.000000,,0.000000,0.000000,,,
3,series_system_c,Choice,Double down on what already works,"You pick your top-performing topic and publish 4 variations of it. Less novelty, more leverage.",0.054000,0.320000,3,0.002800,0.000900,Time & Effort,0,Best when you already have one clear winner. You’re buying momentum with focus.
3,series_system_c,Choice,"Keep one constant, test one variable","You lock your format and test only one change per week. Small experiments, clean signals.",0.050000,0.320000,1,0.002400,0.000700,Time & Effort,0,Lets you learn quickly while keeping your audience oriented.
4,spike_window_a,Question,The 48‑Hour Window,A post is starting to pop. The next 48 hours decide whether you convert the spike into followers—or let it leak.,0.000000,0.000000,,0.000000,0.000000,,,
4,spike_window_a,Choice,Rapid follow‑up cut (ship tonight),"You keep your voice and footage, but a pro tightens the follow-up so the hook and pacing land fast—without delaying release.",0.070000,0.500000,4,0.006000,0.001300,Rapid Edit,-180,Best when editing speed is your bottleneck. Wasteful if it delays posting.
4,spike_window_a,Choice,Fast follow‑up + pin the path,You post a follow-up within 24 hours and pin a comment guiding new viewers to your best content. Speed wins.,0.060000,0.420000,1,0.004000,0.001000,Time & Effort,0,"You capture momentum without spending money, but only if you execute fast."
4,spike_window_b,Question,The Wave Problem,"You’ve seen it before: one video spikes, then nothing. Are you set up to ride the wave with a clean next step?",0.000000,0.000000,,0.000000,0.000000,,,
4,spike_window_b,Choice,Follow‑up + recap pack,A pro helps you ship a tighter follow-up and a recap reel that new viewers can binge. Only worth it if it stays fast.,0.073000,0.530000,4,0.006000,0.001300,Follow‑Up Pack,-260,Strong if spikes happen repeatedly and you want a reusable system. Don’t do it if it slows you down.
4,spike_window_b,Choice,Three‑part follow chain,You publish Part 2 and Part 3 quickly and link them via pinned comments + captions so new viewers binge the chain.,0.060000,0.450000,1,0.004000,0.001000,Time & Effort,0,"Chains convert attention into identity. Pure strategy, no spend."
4,spike_window_c,Question,When Comments Demand Part 2,Your comments are asking for ‘Part 2’. This is a rare signal. Do you respond with speed or polish?,0.000000,0.000000,,0.000000,0.000000,,,
4,spike_window_c,Choice,Polish the continuation (but ship fast),"You keep it fast, but polish captions/audio and tighten pacing so the continuation holds attention and converts better.",0.072000,0.540000,4,0.006000,0.001300,Polish Pass,-140,Worth it if it doesn’t reduce speed. Speed is still the priority in a spike.
4,spike_window_c,Choice,Video replies today,You reply to top comments with quick video replies to keep the thread alive and learn what people want next.,0.060000,0.450000,2,0.004000,0.001000,Time & Effort,0,Comment replies are one of the cheapest momentum engines. Great for early growth.
5,brand_ready_a,Question,Brand‑Ready Signal,A brand checks your page. Do your visuals look consistent and reusable—or do they feel risky and random?,0.000000,0.000000,,0.000000,0.000000,,,
5,brand_ready_a,Choice,Brand-safe asset pack,You create a clean portrait set plus one sample reel that shows how you deliver. Not corporate—dependable.,0.063000,0.430000,3,0.045000,0.001000,Brand Asset Pack,-450,Unlocks better deals when you’re close to deal-ready. The value is trust + reuse.
5,brand_ready_a,Choice,Proof-first pitch,"You prepare a lean one-page pitch with screenshots, niche clarity, and a few solid DIY photos. You lead with results.",0.050000,0.340000,1,0.025000,0.000600,Time & Effort,0,Great if your niche is clear and numbers are strong. You may still lose deals that require polish.
5,brand_ready_b,Question,Would You Hire You?,"If you were a brand manager, would you trust this profile to represent the brand’s image tomorrow?",0.000000,0.000000,,0.000000,0.000000,,,
5,brand_ready_b,Choice,Spec sample + BTS proof,You produce a short ‘spec’ sample and a BTS clip that shows how you work. Strong signal for brand trust.,0.060000,0.400000,3,0.045000,0.001000,Spec Sample Shoot,-600,Best if you’ll actively pitch and close deals. Not worth it if you won’t use it to sell.
5,brand_ready_b,Choice,Clarify positioning + clean the feed,"You remove confusing posts, tighten your promise, and standardize a simple look using what you already have.",0.050000,0.340000,1,0.020000,0.000500,Time & Effort,0,Often the right first step. Brands care about clarity and reliability before camera gear.
5,brand_ready_c,Question,Reusability Check,Brands don’t just want one post. They want assets they can reuse. Does your content look reusable across placements?,0.000000,0.000000,,0.000000,0.000000,,,
5,brand_ready_c,Choice,Reuse-first production day,A short pro session produces multiple reuse-friendly clips + hero images to reduce friction on future deals.,0.060000,0.400000,3,0.050000,0.001000,Reuse‑First Session,-500,Best when inbound interest exists and you want to convert it into better-paying repeat work.
5,brand_ready_c,Choice,Shoot with reuse in mind,"You plan clean frames, consistent light, and space for text using a basic setup. Reuse-friendly without spending.",0.050000,0.340000,1,0.020000,0.000500,Time & Effort,0,"Smart craft without spending. The key is planning for reuse, not buying more gear."
6,premium_tier_a,Question,Subscriptions = Expectations,"Fans want behind-the-scenes and ‘more personal’ content. If you charge, expectations rise. Can you deliver reliably?",0.000000,0.000000,,0.000000,0.000000,,,
6,premium_tier_a,Choice,Premium monthly drop,"You create a reliable monthly drop (photos + reels). Higher perceived value, but only works if subs cover production cost.",0.050000,0.280000,2,0.040000,0.008000,Monthly Premium Pack,-320,Best when demand already exists. The model works when unit economics stay positive over time.
6,premium_tier_a,Choice,Low-pressure tier,"You launch a simple tier with flexible perks. Lower income, higher sustainability, less burnout risk.",0.040000,0.240000,1,0.020000,0.004500,Time & Effort,0,Best when you’re still finding your voice. Sustainable beats impressive for long-term growth.
6,premium_tier_b,Question,The Paid Tier Reality,A paid tier isn’t just money—it’s a promise. Are you building a repeatable delivery system or improvising every month?,0.000000,0.000000,,0.000000,0.000000,,,
6,premium_tier_b,Choice,Baseline premium shoot + DIY cadence,"One pro session sets a premium baseline, then you deliver lighter DIY updates weekly to stay sustainable.",0.046000,0.250000,2,0.034000,0.007000,Baseline Premium Shoot,-220,Balanced approach: premium perception without paying every month. Works if you keep the cadence.
6,premium_tier_b,Choice,Start tiny and learn,"You launch with a small, clear promise (e.g., 2 BTS drops/month) and measure what fans actually want.",0.036000,0.210000,1,0.018000,0.004000,Time & Effort,0,Protects consistency and lets you learn demand without overcommitting.
6,premium_tier_c,Question,Launch Moment,You’re launching something (tier/product/service). Do you treat it like a real campaign or a casual post?,0.000000,0.000000,,0.000000,0.000000,,,
6,premium_tier_c,Choice,Mini-campaign assets,You produce a small campaign set: one hero reel + key photos for reuse. Stronger conversion—if the offer is solid.,0.050000,0.280000,3,0.038000,0.007500,Launch Mini‑Campaign,-450,Best when you already know the offer converts. Assets amplify what’s already working.
6,premium_tier_c,Choice,Simple authentic launch,"You launch with a raw story and a clear offer. Lower production, high trust—if your message is clear.",0.036000,0.210000,1,0.018000,0.004000,Time & Effort,0,Authentic launches can win when the story is strong and the offer is clear.
7,manager_system_a,Question,Growth Feels Random Now,"You’re doing ‘everything right’… but results feel unpredictable. Do you keep guessing, or build a feedback loop?",0.000000,0.000000,,0.000000,0.000000,,,
7,manager_system_a,Choice,Coach + experiments system,"You use a manager/AI tool to suggest experiments, alert you in the first hour, and store learnings so you stop repeating mistakes.",0.061000,0.430000,4,0.020000,0.002000,AI Manager (Creator Plan),-19,"Best when time and uncertainty are your bottlenecks. The value is faster iteration, not magic predictions."
7,manager_system_a,Choice,Weekly manual review,"You track 3 metrics weekly (views, retention proxy, follows) and change one thing at a time. Slow, but honest learning.",0.041000,0.270000,1,0.012000,0.001200,Time & Effort,0,"Great if you’re disciplined. Learning is slower, but you keep full control and cost stays zero."
7,manager_system_b,Question,Your Time Is the Constraint,You can either spend hours guessing what to post… or spend those hours creating. Where do you want the ‘thinking’ to happen?,0.000000,0.000000,,0.000000,0.000000,,,
7,manager_system_b,Choice,Guided scheduling + alerts,"A manager/AI tool suggests windows, flags early underperformance, and recommends quick fixes so you waste less time.",0.058000,0.400000,4,0.020000,0.002000,AI Manager (Pro Plan),-49,Best when time and uncertainty are your bottlenecks. The value is faster iteration, not magic predictions.
7,manager_system_b,Choice,Simple rules + repeat,"You pick two posting windows, one format, and repeat for 3 weeks. Less thinking, stable output.",0.041000,0.270000,1,0.012000,0.001200,Time & Effort,0,"Works when you need simplicity. Not optimal, but it protects your energy and keeps you consistent."
7,manager_system_c,Question,Plateau After the First Wins,"You grew fast early… then plateaued. Do you double down blindly, or diagnose what actually drives your account?",0.000000,0.000000,,0.000000,0.000000,,,
7,manager_system_c,Choice,Diagnose with an experiment engine,"A manager/AI tool proposes A/B-style tests, tracks uplift over fixed windows, and stores learnings so growth becomes less random.",0.061000,0.430000,4,0.020000,0.002000,AI Manager (Growth Plan),-149,"Best when you want repeatable learning. It’s a tool for discipline and feedback loops, not a miracle."
7,manager_system_c,Choice,Diagnose manually,"You review your top 10 posts and replicate the common pattern (topic, hook, length). It’s slower but teaches you.",0.041000,0.270000,1,0.012000,0.001200,Time & Effort,0,Strong learning approach if you’ll actually do the review and stick to the pattern for multiple posts.`;
        }



        parseCSV(text) {
            const rows = [];
            let currentRow = [];
            let currentVal = '';
            let insideQuote = false;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i+1];
                
                if (char === '"') {
                    if (insideQuote && nextChar === '"') {
                        currentVal += '"';
                        i++;
                    } else {
                        insideQuote = !insideQuote;
                    }
                } else if (char === ',' && !insideQuote) {
                    currentRow.push(currentVal);
                    currentVal = '';
                } else if ((char === '\n' || char === '\r') && !insideQuote) {
                    if (currentVal || currentRow.length > 0) {
                        currentRow.push(currentVal);
                        rows.push(currentRow);
                        currentRow = [];
                        currentVal = '';
                    }
                } else {
                    currentVal += char;
                }
            }
            if (currentVal || currentRow.length > 0) {
                currentRow.push(currentVal);
                rows.push(currentRow);
            }
            return rows;
        }

        processChapters(rows) {
            // Supports two CSV schemas:
            // 1) Variation schema (legacy):
            //    Step,Variation,Type,Title,Text,Followers,Views,Engagement,Income,Subscribers,CostName,CostVal,Explanation
            // 2) Step schema (current adam/data/simulator.csv):
            //    Step,Type,Title,Text,Followers,Views,Engagement,Income,Subscribers,CostName,CostVal,Explanation

            // Find the first row that actually starts with a numeric step.
            const firstDataIndex = rows.findIndex(r => r && r.length > 1 && !isNaN(parseInt(r[0], 10)));
            if (firstDataIndex === -1) {
                this.chapters = [];
                this.choices = [];
                return;
            }

            const firstDataRow = rows[firstDataIndex];
            const looksLikeStepSchema = (() => {
                const t = String(firstDataRow[1] || '').trim();
                return t === 'Question' || t === 'Choice';
            })();

            const chaptersMap = new Map(); // Step -> Map(variationId -> { question, choices })

            if (looksLikeStepSchema) {
                // Parse sequentially: each Question starts a new variation bucket; subsequent Choice rows attach to it.
                let current = null; // { step: number, varId: string, varData: {question, choices} }
                const variationCounters = new Map(); // step -> count

                for (let i = firstDataIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length < 3) continue;

                    const step = parseInt(row[0], 10);
                    if (isNaN(step)) continue;

                    const type = String(row[1] || '').trim();
                    const title = String(row[2] || '').trim();
                    const text = String(row[3] || '').trim();

                    if (!chaptersMap.has(step)) {
                        chaptersMap.set(step, new Map());
                        variationCounters.set(step, 0);
                    }

                    if (type === 'Question') {
                        const nextCount = (variationCounters.get(step) || 0) + 1;
                        variationCounters.set(step, nextCount);
                        const varId = `step_${step}_q_${nextCount}`;
                        const varData = { question: null, choices: [] };
                        varData.question = { id: varId, title, text, choices: [] };
                        chaptersMap.get(step).set(varId, varData);
                        current = { step, varId, varData };
                        continue;
                    }

                    if (type === 'Choice') {
                        // Attach to the most recent Question within the same step.
                        if (!current || current.step !== step) continue;

                        const followersMul = parseFloat(row[4]);
                        const viewsMul = parseFloat(row[5]);
                        const engagementMul = parseFloat(row[6]);
                        const incomeMul = parseFloat(row[7]);
                        const subscribersMul = parseFloat(row[8]);

                        const toPct = (mul) => (Number.isFinite(mul) ? (mul - 1) : 0);
                        const engagementDelta = Number.isFinite(engagementMul)
                            ? Math.round((engagementMul - 1) * 20)
                            : 0;

                        const effect = {
                            followersPct: toPct(followersMul),
                            viewsPct: toPct(viewsMul),
                            engagement: engagementDelta,
                            incomePct: toPct(incomeMul),
                            subscribersPct: toPct(subscribersMul),
                            costs: []
                        };

                        const costName = row[9];
                        const costVal = row[10];
                        if (costName && costVal !== undefined && costVal !== null && String(costVal).trim() !== '') {
                            effect.costs.push({ name: String(costName).trim(), val: parseInt(costVal, 10) || 0 });
                        }

                        const choice = {
                            title,
                            text,
                            effect,
                            explanation: row[11] ? String(row[11]).trim() : null
                        };

                        current.varData.choices.push(choice);
                    }
                }
            } else {
                // Variation schema (legacy)
                const dataRows = rows.slice(1);

                dataRows.forEach(row => {
                    if (row.length < 5) return;
                    const step = parseInt(row[0], 10);
                    if (isNaN(step)) return;

                    const variation = row[1];
                    const type = row[2];
                    const title = row[3];
                    const text = row[4];

                    if (!chaptersMap.has(step)) {
                        chaptersMap.set(step, new Map());
                    }
                    const stepVariations = chaptersMap.get(step);

                    if (!stepVariations.has(variation)) {
                        stepVariations.set(variation, { question: null, choices: [] });
                    }
                    const varData = stepVariations.get(variation);

                    if (type === 'Question') {
                        varData.question = {
                            id: variation,
                            title: title,
                            text: text,
                            choices: []
                        };
                    } else if (type === 'Choice') {
                        const effect = {
                            followersPct: parseFloat(row[5]) || 0,
                            viewsPct: parseFloat(row[6]) || 0,
                            engagement: parseInt(row[7], 10) || 0,
                            incomePct: parseFloat(row[8]) || 0,
                            subscribersPct: parseFloat(row[9]) || 0,
                            costs: []
                        };

                        if (row[10] && row[11]) {
                            effect.costs.push({ name: row[10], val: parseInt(row[11], 10) || 0 });
                        }

                        const choice = {
                            title: title,
                            text: text,
                            effect: effect,
                            explanation: row[12] || null
                        };
                        varData.choices.push(choice);
                    }
                });
            }
            
            // Convert map to array, selecting one random variation per step
            this.chapters = [];
            const sortedSteps = Array.from(chaptersMap.keys()).sort((a, b) => a - b);
            
            sortedSteps.forEach(step => {
                const variations = Array.from(chaptersMap.get(step).values());
                // Randomly select one variation
                const selectedVar = variations[Math.floor(Math.random() * variations.length)];
                
                if (selectedVar.question) {
                    // Randomize choice order for first two questions
                    let choices = selectedVar.choices;
                    if (step === 1 || step === 2) {
                        choices = [...choices].sort(() => Math.random() - 0.5);
                    }

                    const chapter = {
                        ...selectedVar.question,
                        choices: choices
                    };
                    this.chapters.push(chapter);
                }
            });
            
            // Initialize choices array based on loaded chapters
            this.choices = new Array(this.chapters.length).fill(null);
        }

        destroy() {
            const startBtn = document.getElementById('startSimBtn');
            if (startBtn) {
                startBtn.replaceWith(startBtn.cloneNode(true));
            }
            const resetBtn = document.getElementById('btnReset');
            if (resetBtn) {
                resetBtn.replaceWith(resetBtn.cloneNode(true));
            }
        }

        cacheElements() {
            this.els = {
                container: document.getElementById('simContent'),
                hero: document.getElementById('simHero'),

                // Aspects table
                aspectTableBody: document.getElementById('aspectTableBody'),
                
                // Chart
                chart: document.getElementById('growthChart'),
                
                // Controls
                btnReset: document.getElementById('btnReset')
            };
        }

        bindEvents() {
            const startBtn = document.getElementById('startSimBtn');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    this.startSimulation();
                });
            }

            if (this.els.btnReset) {
                this.els.btnReset.addEventListener('click', () => this.reset());
            }
        }

        startSimulation() {
            if (this.chapters.length === 0) {
                alert("Error: No chapters loaded. Please refresh the page.");
                return;
            }

            // Get user's starting followers
            const followerInput = document.getElementById('startingFollowers');
            const inputValue = parseInt(followerInput?.value);
            if (inputValue >= 100) {
                this.userStartingFollowers = inputValue;
                this.initialState.followers = inputValue;
                this.initialState.views = inputValue * 5; // Rough estimate: 5x views vs followers
                this.initialState.historyByStep = [inputValue];
                this.state = JSON.parse(JSON.stringify(this.initialState));
                this.updateDashboard();
            }

            if (this.els.hero) {
                this.els.hero.style.display = 'none';
            }
            this.renderAllChapters();
        }

        reset() {
            this.userStartingFollowers = 1000;
            this.initialState.followers = 1000;
            this.initialState.views = 5000;
            this.initialState.historyByStep = [1000];
            this.state = JSON.parse(JSON.stringify(this.initialState));
            this.choices.fill(null);
            this.updateDashboard();
            
            if (this.els.hero) {
                this.els.hero.style.display = 'block';
                this.els.hero.style.animation = 'fadeIn 0.5s ease';
                const followerInput = document.getElementById('startingFollowers');
                const startBtn = document.getElementById('startSimBtn');
                if (followerInput) followerInput.value = '';
                if (startBtn) startBtn.disabled = true;
            }
            this.els.container.innerHTML = '';
        }

        recalculateState(options = {}) {
            // Reset to initial
            this.state = JSON.parse(JSON.stringify(this.initialState));
            this.state.costs = []; // Ensure costs is reset
            const totalDecisions = this.chapters.length - 1;
            this.state.historyByStep = new Array(totalDecisions + 1).fill(this.initialState.followers);
            this.state.historyByStep[0] = this.initialState.followers;
            
            // Replay all choices with scaled effects
            for (let chapterIndex = 0; chapterIndex < totalDecisions; chapterIndex++) {
                const choiceIndex = this.choices[chapterIndex];
                
                const chapter = this.chapters[chapterIndex];
                if (!chapter || !chapter.choices) return;
                
                const choice = chapter.choices[choiceIndex];
                if (!choice) {
                    this.state.historyByStep[chapterIndex + 1] = this.state.followers;
                    continue;
                }

                // Scale the effect based on current follower count
                const scaledEffect = this.scaleEffect(choice.effect, this.state.followers);

                // Apply scaled effects
                this.state.followers += scaledEffect.followers;
                this.state.views += scaledEffect.views;
                this.state.engagement = Math.min(100, Math.max(0, this.state.engagement + scaledEffect.engagement));
                this.state.income += scaledEffect.income;
                this.state.subscribers += scaledEffect.subscribers;
                
                if (scaledEffect.costs && scaledEffect.costs.length > 0) {
                    this.state.costs.push(...scaledEffect.costs);
                }

                this.state.historyByStep[chapterIndex + 1] = this.state.followers;
            }

            if (!options.suppressRender) {
                this.updateDashboard();
            }
            
            // Check if all choices made, then show end screen
            const allChoicesMade = this.choices.slice(0, -1).every(c => c !== null);
            if (allChoicesMade) {
                const endExists = document.getElementById(`chapter-${this.chapters.length - 1}`);
                if (!endExists) {
                    this.renderAllChapters();
                }
            }
        }

        formatSignedCompact(num) {
            const abs = this.formatNumber(Math.abs(num));
            if (num === 0) return '0';
            return `${num > 0 ? '+' : '-'}${abs}`;
        }

        formatSignedMoney(num) {
            const abs = this.formatNumber(Math.abs(num));
            if (num === 0) return '$0';
            return `${num > 0 ? '+$' : '-$'}${abs}`;
        }

        getChoiceMonthlyCost(choice) {
            if (!choice || !choice.effect || !Array.isArray(choice.effect.costs)) return 0;
            return choice.effect.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0);
        }

        getCurrentMonthlyCost() {
            if (!this.state || !Array.isArray(this.state.costs)) return 0;
            return this.state.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0);
        }

        formatSignedPP(num) {
            if (num === 0) return '0pp';
            return `${num > 0 ? '+' : ''}${num}pp`;
        }

        renderAspectsTable(skipChapterIndex = -1) {
            if (!this.els.aspectTableBody) return;

            const totalDecisions = this.chapters.length - 1;
            const tbody = this.els.aspectTableBody;
            tbody.innerHTML = '';

            const currentCost = this.getCurrentMonthlyCost();

            // Add current row first
            const currentRow = document.createElement('tr');
            currentRow.className = 'current-row';
            currentRow.innerHTML = `
                <td>TOTAL</td>
                <td data-full="${this.formatNumberLong(this.state.followers)}">
                    <span class="mobile-format">${this.formatNumber(this.state.followers).replace(/(\d)([KMB])/g, '$1 $2')}</span>
                    <span class="desktop-format">${this.formatNumberLong(this.state.followers)}</span>
                </td>
                <td data-full="${this.formatNumberLong(this.state.views)}">
                    <span class="mobile-format">${this.formatNumber(this.state.views).replace(/(\d)([KMB])/g, '$1 $2')}</span>
                    <span class="desktop-format">${this.formatNumberLong(this.state.views)}</span>
                </td>
                <td data-full="${this.formatNumberLong(this.state.subscribers)}">
                    <span class="mobile-format">${this.formatNumber(this.state.subscribers).replace(/(\d)([KMB])/g, '$1 $2')}</span>
                    <span class="desktop-format">${this.formatNumberLong(this.state.subscribers)}</span>
                </td>
                <td>${this.formatSignedMoney(currentCost).replace(/(\$)(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</td>
                <td>${('$' + this.formatNumber(this.state.income)).replace(/(\$)(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</td>
            `;
            tbody.appendChild(currentRow);

            // Add header row
            const headerRow = document.createElement('tr');
            headerRow.className = 'header-row';
            headerRow.innerHTML = `
                <th>Concept</th>
                <th>Followers</th>
                <th>Views / Mo</th>
                <th>Subscribers</th>
                <th>Cost  / mo</th>
                <th>Earnings / mo</th>
            `;
            tbody.appendChild(headerRow);

            let zebraIndex = 0;

            // Calculate totals for mobile summary row
            let totalFollowersDelta = 0;
            let totalViewsDelta = 0;
            let totalSubscribersDelta = 0;
            let totalCostDelta = 0;
            let totalIncomeDelta = 0;

            for (let i = 0; i < totalDecisions; i++) {
                if (i === skipChapterIndex) continue;
                const choiceIdx = this.choices[i];
                if (choiceIdx === null) continue;
                const chapter = this.chapters[i];
                const choice = chapter.choices[choiceIdx];
                if (!choice) continue;

                const row = document.createElement('tr');
                row.classList.add('decision-row');
                row.dataset.chapterIndex = String(i);
                row.classList.add(zebraIndex % 2 === 0 ? 'zebra-odd' : 'zebra-even');
                zebraIndex++;
                
                // Get the follower count at the time this decision was made
                const followersAtStep = this.state.historyByStep[i] || this.initialState.followers;
                
                // Scale the effect based on what the account size was at that step
                const scaledEffect = this.scaleEffect(choice.effect, followersAtStep);

                // Accumulate deltas for mobile summary
                totalFollowersDelta += scaledEffect.followers;
                totalViewsDelta += scaledEffect.views;
                totalSubscribersDelta += scaledEffect.subscribers;
                totalCostDelta += scaledEffect.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0);
                totalIncomeDelta += scaledEffect.income;

                const costDelta = scaledEffect.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0);
                const hasMeaningfulUpside =
                    (scaledEffect.followers || 0) > 0 ||
                    (scaledEffect.views || 0) > 0 ||
                    (scaledEffect.engagement || 0) > 0 ||
                    (scaledEffect.subscribers || 0) > 0 ||
                    (scaledEffect.income || 0) > 0;

                // Determine if this was the best choice for this chapter
                const isBestChoice = (metric) => {
                    let best = -Infinity;
                    for (let optIdx = 0; optIdx < chapter.choices.length; optIdx++) {
                        const opt = chapter.choices[optIdx];
                        const scaledOpt = this.scaleEffect(opt.effect, followersAtStep);
                        if (scaledOpt[metric] > best) best = scaledOpt[metric];
                    }
                    return scaledEffect[metric] >= best && scaledEffect[metric] > 0;
                };
                
                const followersPct = followersAtStep > 0 ? (scaledEffect.followers / followersAtStep) * 100 : 0;
                const viewsPct = (this.state.views > 0) ? (scaledEffect.views / this.state.views) * 100 : 0;
                const subscribersPct = (this.state.subscribers > 0) ? (scaledEffect.subscribers / this.state.subscribers) * 100 : 0;
                
                // Only apply green highlighting if best choice was selected
                const getIntensityClass = (value, pct, isBest) => {
                    if (value > 0 && isBest) {
                        if (pct > 10) return 'delta-pos-high';
                        if (pct > 2) return 'delta-pos-medium';
                        return 'delta-pos-low';
                    }
                    return value < 0 ? 'delta-neg' : '';
                };
                
                const clsF = getIntensityClass(scaledEffect.followers, followersPct, isBestChoice('followers'));
                const clsV = getIntensityClass(scaledEffect.views, viewsPct, isBestChoice('views'));
                const clsSubscribers = getIntensityClass(scaledEffect.subscribers, subscribersPct, isBestChoice('subscribers'));
                const clsInc = getIntensityClass(scaledEffect.income, 0, isBestChoice('income'));
                const clsCost = '';

                // Delay applying green best-choice highlight only for the row currently being animated.
                const delayGreen = (cls) => {
                    // Only delay if this specific row is being animated
                    if (this._pendingHighlightChapter !== i) return { cls, data: '' };
                    if (!cls || !cls.startsWith('delta-pos')) return { cls, data: '' };
                    return { cls: '', data: cls };
                };

                const fDelay = delayGreen(clsF);
                const vDelay = delayGreen(clsV);
                const subscribersDelay = delayGreen(clsSubscribers);
                const incDelay = delayGreen(clsInc);

                row.innerHTML = `
                    <td>${i + 1}. ${chapter.title}</td>
                    <td class="${fDelay.cls}" ${fDelay.data ? `data-final-class=\"${fDelay.data}\"` : ''}>${this.formatSignedCompact(scaledEffect.followers).replace(/(\d)([KMB])/g, '$1 $2')}</td>
                    <td class="${vDelay.cls}" ${vDelay.data ? `data-final-class=\"${vDelay.data}\"` : ''}>${this.formatSignedCompact(scaledEffect.views).replace(/(\d)([KMB])/g, '$1 $2')}</td>
                    <td class="${subscribersDelay.cls}" ${subscribersDelay.data ? `data-final-class=\"${subscribersDelay.data}\"` : ''}>${this.formatSignedCompact(scaledEffect.subscribers).replace(/(\d)([KMB])/g, '$1 $2')}</td>
                    <td>${this.formatSignedMoney(costDelta).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</td>
                    <td class="${incDelay.cls}" ${incDelay.data ? `data-final-class=\"${incDelay.data}\"` : ''}>${this.formatSignedMoney(scaledEffect.income).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</td>
                `;

                tbody.appendChild(row);
            }

            // Add mobile summary row (only visible on mobile via CSS)
            const mobileSummaryRow = document.createElement('tr');
            mobileSummaryRow.className = 'mobile-summary-row';
            mobileSummaryRow.innerHTML = `
                <td>All Decisions</td>
                <td><span class="increment-label">${this.formatSignedCompact(totalFollowersDelta).replace(/(\d)([KMB])/g, '$1 $2')}</span></td>
                <td><span class="increment-label">${this.formatSignedCompact(totalViewsDelta).replace(/(\d)([KMB])/g, '$1 $2')}</span></td>
                <td><span class="increment-label">${this.formatSignedCompact(totalSubscribersDelta).replace(/(\d)([KMB])/g, '$1 $2')}</span></td>
                <td><span class="increment-label">${this.formatSignedMoney(totalCostDelta).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</span></td>
                <td><span class="increment-label">${this.formatSignedMoney(totalIncomeDelta).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2')}</span></td>
            `;
            tbody.appendChild(mobileSummaryRow);
        }

        renderAllChapters() {
            this.els.container.innerHTML = '';
            
            // Render ALL chapters at once (except the end screen until all choices made)
            this.chapters.forEach((chapter, index) => {
                const isEnd = index === this.chapters.length - 1;
                const selectedChoice = this.choices[index];
                
                // Skip end screen until all choices are made
                if (isEnd) {
                    const allChoicesMade = this.choices.slice(0, -1).every(c => c !== null);
                    if (!allChoicesMade) return;
                }

                const div = document.createElement('div');
                div.className = 'chapter-card';
                div.id = `chapter-${index}`;
                
                let html = `
                    <h3>Chapter ${index + 1}: ${chapter.title}</h3>
                    <p>${chapter.text}</p>
                `;

                if (isEnd) {
                    html += this.getEndScreen();
                } else {
                    html += `<div class="choices-grid">`;
                    chapter.choices.forEach((choice, i) => {
                        const isSelected = selectedChoice === i;
                        const activeClass = isSelected ? 'active' : '';
                        
                        html += `
                            <button class="choice-btn ${activeClass}" data-chapter="${index}" data-choice="${i}">
                                <p>${choice.text}</p>
                            </button>
                        `;
                    });
                    html += `</div>`;
                    
                    // Add feedback box if a choice has been made
                    if (selectedChoice !== null) {
                        const chosenChoice = chapter.choices[selectedChoice];
                        const feedback = this.getChoiceFeedback(index, selectedChoice);
                        html += `
                            <div class="choice-feedback ${feedback.isExcellent ? 'excellent' : 'valid'}">
                                <div class="feedback-title">${feedback.isExcellent ? '✓ Excellent Choice!' : '✓ Valid option'}</div>
                                <div class="feedback-text">${feedback.explanation}</div>
                            </div>
                        `;
                    }
                }

                div.innerHTML = html;
                this.els.container.appendChild(div);
            });

            // Bind events for all rendered buttons
            const btns = this.els.container.querySelectorAll('.choice-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const chapterIdx = parseInt(e.currentTarget.dataset.chapter);
                    const choiceIdx = parseInt(e.currentTarget.dataset.choice);
                    this.handleChoice(chapterIdx, choiceIdx);
                });
            });

            // Bind hover preview
            this.bindHoverPreview();
        }

        handleChoice(chapterIndex, choiceIndex) {
            // Clear preview line immediately when making a choice
            this.previewData = null;

            const prevLast = this.getLastAnsweredStep();
            const isNewAnswer = this.choices[chapterIndex] === null;

            // Snapshot previous decision-row deltas (for smooth count-up)
            const prevChoiceIdx = this.choices[chapterIndex];
            const prevFollowersAtStep = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;
            const prevChoice = (prevChoiceIdx != null && prevChoiceIdx !== null)
                ? this.chapters[chapterIndex]?.choices?.[prevChoiceIdx]
                : null;
            const prevScaled = prevChoice ? this.scaleEffect(prevChoice.effect, prevFollowersAtStep) : null;
            const prevCostDelta = prevScaled?.costs
                ? prevScaled.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0)
                : 0;
            const prevRowFrom = {
                followersDelta: prevScaled ? prevScaled.followers : 0,
                viewsDelta: prevScaled ? prevScaled.views : 0,
                subscribersDelta: prevScaled ? prevScaled.subscribers : 0,
                costDelta: prevCostDelta,
                incomeDelta: prevScaled ? prevScaled.income : 0
            };

            // Update choice
            this.choices[chapterIndex] = choiceIndex;
            this.recalculateState({ suppressRender: true });
            this.updateAllChaptersUI();

            const nextLast = this.getLastAnsweredStep();
            // Only delay highlights for the specific row being animated, not all rows
            this._pendingHighlightChapter = chapterIndex;
            // Animate chart if it's a new answer or if we're changing an existing one
            this._pendingChartAnim = { fromStep: chapterIndex, toStep: chapterIndex + 1 };

            // Snapshot new decision-row deltas
            const newFollowersAtStep = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;
            const newChoice = this.chapters[chapterIndex]?.choices?.[choiceIndex];
            const newScaled = newChoice ? this.scaleEffect(newChoice.effect, newFollowersAtStep) : null;
            const newCostDelta = newScaled?.costs
                ? newScaled.costs.reduce((sum, c) => sum + (Number(c.val) || 0), 0)
                : 0;
            const newRowTo = {
                followersDelta: newScaled ? newScaled.followers : 0,
                viewsDelta: newScaled ? newScaled.views : 0,
                subscribersDelta: newScaled ? newScaled.subscribers : 0,
                costDelta: newCostDelta,
                incomeDelta: newScaled ? newScaled.income : 0
            };
            this._pendingDecisionAnim = { chapterIndex, from: prevRowFrom, to: newRowTo };

            // Render immediately but skip the new row so it doesn't appear yet
            this.updateDashboard(chapterIndex);

            const runRowAndHighlights = () => {
                const anim = this._pendingDecisionAnim;
                this._pendingDecisionAnim = null;
                
                // Now render the full dashboard including the new row, but skip chart update
                this.renderAspectsTable();
                
                this.animateDecisionRow(anim, () => {
                    if (this._pendingHighlightChapter != null) {
                        this.applyDelayedHighlights();
                        this._pendingHighlightChapter = null;
                    }
                    // Re-render chart to the final (non-animated) state after the segment animation.
                    this.updateChart();
                });
            };

            // On mobile, skip all animations and show final state immediately
            if (window.innerWidth < 600) {
                this._pendingDecisionAnim = null;
                this._pendingHighlightChapter = null;
                this.updateDashboard();
            } else {
                const segment = this.els.chart?.querySelector('.chart-segment-anim');
                if (segment) {
                    let handled = false;
                    const onEnd = () => {
                        if (handled) return;
                        handled = true;
                        segment.removeEventListener('animationend', onEnd);
                        runRowAndHighlights();
                    };
                    segment.addEventListener('animationend', onEnd);
                    // Fallback in case animation event doesn't fire (e.g. tab backgrounded)
                    setTimeout(onEnd, 1100);
                } else {
                    runRowAndHighlights();
                }
            }
        }

        updateAllChaptersUI() {
            // Update which buttons are active without re-rendering everything
            this.chapters.forEach((chapter, index) => {
                const chapterEl = document.querySelector(`#chapter-${index}`);
                if (!chapterEl) return;

                const selectedChoice = this.choices[index];
                const btns = chapterEl.querySelectorAll('.choice-btn');
                btns.forEach((btn, i) => {
                    if (selectedChoice === i) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Keep the feedback box in sync immediately after each selection.
                const choicesGrid = chapterEl.querySelector('.choices-grid');
                let feedbackEl = chapterEl.querySelector('.choice-feedback');

                const hasSelection = selectedChoice != null;
                if (!choicesGrid || !chapter?.choices) {
                    if (feedbackEl) feedbackEl.remove();
                    return;
                }

                if (!hasSelection) {
                    if (feedbackEl) feedbackEl.remove();
                    return;
                }

                const feedback = this.getChoiceFeedback(index, selectedChoice);

                if (!feedbackEl) {
                    feedbackEl = document.createElement('div');
                    feedbackEl.className = 'choice-feedback';

                    const titleEl = document.createElement('div');
                    titleEl.className = 'feedback-title';
                    feedbackEl.appendChild(titleEl);

                    const textEl = document.createElement('div');
                    textEl.className = 'feedback-text';
                    feedbackEl.appendChild(textEl);

                    choicesGrid.insertAdjacentElement('afterend', feedbackEl);
                }

                feedbackEl.classList.toggle('excellent', !!feedback.isExcellent);
                feedbackEl.classList.toggle('valid', !feedback.isExcellent);

                const titleNode = feedbackEl.querySelector('.feedback-title');
                const textNode = feedbackEl.querySelector('.feedback-text');
                if (titleNode) titleNode.textContent = feedback.isExcellent ? '✓ Excellent Choice!' : '✓ Valid option';
                if (textNode) textNode.textContent = feedback.explanation;
            });
        }

        bindHoverPreview() {
            const btns = this.els.container.querySelectorAll('.choice-btn');
            btns.forEach(btn => {
                btn.addEventListener('mouseenter', (e) => {
                    const chapterIdx = parseInt(e.currentTarget.dataset.chapter);
                    const choiceIdx = parseInt(e.currentTarget.dataset.choice);
                    this.showPreview(chapterIdx, choiceIdx);
                });
                btn.addEventListener('mouseleave', () => {
                    this.hidePreview();
                });
            });
        }

        showPreview(chapterIndex, choiceIndex) {
            const chapter = this.chapters[chapterIndex];
            if (!chapter || !chapter.choices) return;
            const choice = chapter.choices[choiceIndex];
            if (!choice) return;

            const totalDecisions = this.chapters.length - 1;
            if (chapterIndex < 0 || chapterIndex >= totalDecisions) return;

            const fromFollowers = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;

            // Scale the effect based on current followers at that step
            const scaledEffect = this.scaleEffect(choice.effect, fromFollowers);
            const toFollowers = fromFollowers + scaledEffect.followers;

            this.previewData = {
                fromStep: chapterIndex,
                fromFollowers,
                toFollowers
            };
            this.updateChart();
        }

        hidePreview() {
            this.previewData = null;
            this.updateChart();
        }

        updateDashboard(skipChapterIndex = -1) {
            this.renderAspectsTable(skipChapterIndex);
            this.updateChart();
        }

        updateChart() {
            if (!this.els.chart) return;
            
            const totalChapters = this.chapters.length - 1; // Exclude end
            const data = Array.isArray(this.state.historyByStep)
                ? this.state.historyByStep
                : [this.initialState.followers];

            const baseline = data[0] ?? this.initialState.followers;

            // Draw up to last answered decision so the line "moves horizontally" as choices are made.
            let lastAnsweredStep = 0;
            for (let i = 0; i < totalChapters; i++) {
                if (this.choices[i] !== null) lastAnsweredStep = i + 1;
            }
            const plottedData = data.slice(0, Math.min(lastAnsweredStep + 1, totalChapters + 1));
            
            // Always show full width for all potential chapters
            const width = this.els.chart.clientWidth || 300;
            const height = this.els.chart.clientHeight || 100;
            // SVG text is clipped to the viewport; we need extra left padding so Y labels fit.
            const padLeft = 44;
            const padRight = 16;
            const padTop = 16;
            const padBottom = 26; // room for x labels
            const chartWidth = width - padLeft - padRight;
            const chartHeight = height - padTop - padBottom;
            const chartBottomY = height - padBottom;
            const chartTopY = padTop;
            
            // Calculate theoretical maximum followers (best possible path with scaling)
            let theoreticalMax = this.initialState.followers;
            let currentFollowers = this.initialState.followers;
            for (let i = 0; i < totalChapters; i++) {
                const chapter = this.chapters[i];
                if (chapter && chapter.choices && chapter.choices.length > 0) {
                    // Find the choice with max followers gain
                    const bestChoice = chapter.choices.reduce((best, choice) => 
                        (choice.effect.followers > best.effect.followers) ? choice : best
                    );
                    const scaledEffect = this.scaleEffect(bestChoice.effect, currentFollowers);
                    currentFollowers += scaledEffect.followers;
                    theoreticalMax = currentFollowers;
                }
            }

            // Use follower range from starting point to theoretical max for better visualization
            const minFollowers = this.initialState.followers;
            const maxFollowers = theoreticalMax;
            const range = maxFollowers - minFollowers || 1;

            // Generate main path
            let pathD = '';
            let circles = '';
            let animSegment = '';
            let burst = '';

            const segDurationMs = 700;
            // Allow chart animation for both new answers and changed answers
            const chartAnim = (!this.previewData && this._pendingChartAnim && this._pendingChartAnim.toStep <= lastAnsweredStep + 1)
                ? { ...this._pendingChartAnim }
                : null;

            // When animating, show path up to the fromStep; otherwise show full plotted data
            const baseData = chartAnim
                ? data.slice(0, Math.min(chartAnim.fromStep + 1, totalChapters + 1))
                : plottedData;
            
            baseData.forEach((val, i) => {
                const x = padLeft + (i / totalChapters) * chartWidth;
                const y = chartBottomY - (((val - minFollowers) / range) * chartHeight);
                
                if (i === 0) {
                    pathD = `M ${x} ${y}`;
                } else {
                    pathD += ` L ${x} ${y}`;
                }
                
                // Add dot for each data point
                circles += `<circle cx="${x}" cy="${y}" r="5" fill="#3b82f6" filter="url(#glow)" />`;
            });

            // Optional animation: grow only the newest segment + burst
            if (chartAnim) {
                const fromStep = Math.max(0, Math.min(totalChapters, chartAnim.fromStep));
                const toStep = Math.max(0, Math.min(totalChapters, chartAnim.toStep));

                if (toStep > fromStep && data.length >= toStep + 1) {
                    const fromX = padLeft + (fromStep / totalChapters) * chartWidth;
                    const toX = padLeft + (toStep / totalChapters) * chartWidth;
                    const fromY = chartBottomY - (((data[fromStep] - minFollowers) / range) * chartHeight);
                    const toY = chartBottomY - (((data[toStep] - minFollowers) / range) * chartHeight);

                    const segLen = Math.hypot(toX - fromX, toY - fromY);
                    animSegment = `
                        <path class="chart-segment-anim" d="M ${fromX} ${fromY} L ${toX} ${toY}"
                            fill="none" stroke="#3b82f6" stroke-width="3" filter="url(#glow)"
                            stroke-dasharray="${segLen}" stroke-dashoffset="${segLen}" />
                    `;

                    burst = `
                        <circle class="chart-dot-pop" style="animation-delay: ${segDurationMs}ms" cx="${toX}" cy="${toY}" r="5" fill="#3b82f6" filter="url(#glow)" />
                        <circle class="burst-ring" style="animation-delay: ${segDurationMs}ms" cx="${toX}" cy="${toY}" r="10" fill="none" stroke="rgba(59,130,246,0.9)" stroke-width="2" />
                    `;
                }

                // Clear pending anim once rendered
                this._pendingChartAnim = null;
            }

            // Fill area under the line
            const lastX = padLeft + ((baseData.length - 1) / totalChapters) * chartWidth;
            const fillD = pathD + ` L ${lastX} ${chartBottomY} L ${padLeft} ${chartBottomY} Z`;

            // Preview line (greyed out potential)
            let previewPath = '';
            let previewCircle = '';
            if (this.previewData) {
                const fromStep = this.previewData.fromStep;
                const fromX = padLeft + (fromStep / totalChapters) * chartWidth;
                const toX = padLeft + ((fromStep + 1) / totalChapters) * chartWidth;
                const fromY = chartBottomY - (((this.previewData.fromFollowers - minFollowers) / range) * chartHeight);
                const toY = chartBottomY - (((this.previewData.toFollowers - minFollowers) / range) * chartHeight);

                previewPath = `<path d="M ${fromX} ${fromY} L ${toX} ${toY}" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />`;
                previewCircle = `<circle cx="${toX}" cy="${toY}" r="4" fill="#666" />`;
            }

            // Axis lines
            const axisLines = `
                <line x1="${padLeft}" y1="${chartBottomY}" x2="${width - padRight}" y2="${chartBottomY}" stroke="#333" stroke-width="1" />
                <line x1="${padLeft}" y1="${chartTopY}" x2="${padLeft}" y2="${chartBottomY}" stroke="#333" stroke-width="1" />
            `;

            // Grid + labels
            const yTicks = 4;
            let grid = '';
            let labels = '';

            for (let t = 0; t <= yTicks; t++) {
                const ratio = t / yTicks;
                const y = chartBottomY - (ratio * chartHeight);
                const val = minFollowers + (ratio * range);
                const label = new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                }).format(val).replace(/(\d)([KMB])/g, '$1 $2');

                grid += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
                labels += `<text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${label}</text>`;
            }

            // Vertical grid + x labels for steps
            for (let i = 0; i <= totalChapters; i++) {
                const x = padLeft + (i / totalChapters) * chartWidth;
                grid += `<line x1="${x}" y1="${chartTopY}" x2="${x}" y2="${chartBottomY}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />`;

                const stepLabel = i === 0 ? 'Start' : String(i);
                labels += `<text x="${x}" y="${chartBottomY + 14}" text-anchor="middle" font-size="9" fill="#555">${stepLabel}</text>`;
            }

            this.els.chart.innerHTML = `
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                ${grid}
                ${axisLines}
                ${labels}
                <path d="${fillD}" fill="url(#chartGradient)" stroke="none" />
                <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" filter="url(#glow)" />
                ${animSegment}
                ${circles}
                ${previewPath}
                ${previewCircle}
                ${burst}
            `;
        }

        getChoiceFeedback(chapterIndex, choiceIndex) {
            const chapter = this.chapters[chapterIndex];
            const choice = chapter.choices[choiceIndex];
            
            // Get current followers at this step
            const followersAtStep = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;
            
            // Determine if this is the best choice by comparing follower gains
            let bestFollowerGain = -Infinity;
            chapter.choices.forEach(opt => {
                const scaledOpt = this.scaleEffect(opt.effect, followersAtStep);
                if (scaledOpt.followers > bestFollowerGain) {
                    bestFollowerGain = scaledOpt.followers;
                }
            });
            
            const scaledEffect = this.scaleEffect(choice.effect, followersAtStep);
            const isExcellent = scaledEffect.followers >= bestFollowerGain && scaledEffect.followers > 0;
            
            // Generate explanation based on the impact
            let explanation = '';
            if (choice.explanation) {
                explanation = choice.explanation;
            } else if (isExcellent) {
                explanation = 'This choice maximizes your follower growth for this decision. ';
                if (scaledEffect.income > 0) {
                    explanation += 'It also increases your income potential.';
                } else if (scaledEffect.income < 0) {
                    explanation += 'While it requires investment, the growth justifies the cost.';
                } else {
                    explanation += 'It balances growth without additional expenses.';
                }
            } else {
                explanation = 'This is a reasonable choice. ';
                if (scaledEffect.followers > 0) {
                    explanation += 'It provides steady growth ';
                    if (scaledEffect.income >= 0) {
                        explanation += 'without requiring significant investment.';
                    } else {
                        explanation += 'though the cost-to-growth ratio could be better.';
                    }
                } else {
                    explanation += 'Consider whether the tradeoffs align with your current goals.';
                }
            }
            
            return { isExcellent, explanation };
        }

        getEndScreen() {
            let verdict = '';
            if (this.state.income < 0) {
                verdict = 'Your plan created more cost than return. That doesn’t mean “never spend”—it means spend with a clear goal and a plan.';
            } else if (this.state.followers > 100000) {
                verdict = 'You found leverage: better assets, better consistency, and a clearer brand. Keep the parts that work and cut the waste.';
            } else {
                verdict = 'You built steady progress. The next step is refining: clearer positioning, cleaner production, and fewer random experiments.';
            }

            return `
                <div class="end-screen">
                    <h2>Simulation Results</h2>
                    <p class="verdict">${verdict}</p>
                    <button class="btn-primary" onclick="window.location.reload()">Play Again</button>
                </div>
            `;
        }

        formatNumber(num) {
            return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
        }

        formatNumberLong(num) {
            // Format numbers with ' for millions and , for thousands
            // Example: 1'000,000 or 123'456,789
            const absNum = Math.abs(num);
            const sign = num < 0 ? '-' : '';
            
            if (absNum >= 1000000) {
                // Has millions
                const millions = Math.floor(absNum / 1000000);
                const remainder = absNum % 1000000;
                const thousands = Math.floor(remainder / 1000);
                const ones = remainder % 1000;
                
                let result = sign + millions.toLocaleString('en-US');
                result += "'" + thousands.toString().padStart(3, '0');
                result += "," + ones.toString().padStart(3, '0');
                return result;
            } else if (absNum >= 1000) {
                // Only thousands
                const thousands = Math.floor(absNum / 1000);
                const ones = absNum % 1000;
                return sign + thousands.toLocaleString('en-US') + ',' + ones.toString().padStart(3, '0');
            } else {
                return sign + absNum.toString();
            }
        }
    }

    // Expose to global scope for app.js to handle
    window.CreatorSimulator = new CreatorSimulator();

    // Flip Card Functionality
    class FlipCardManager {
        constructor() {
            this.initFlipCards();
        }

        initFlipCards() {
            // Get all flip cards
            const flipCards = document.querySelectorAll('.flip-card');
            
            flipCards.forEach((card) => {
                const frontClickable = card.querySelector('.flip-card-front .clickable');
                const backClickable = card.querySelector('.flip-card-back.clickable');
                
                // Click on front to flip to back
                if (frontClickable) {
                    frontClickable.addEventListener('click', (e) => {
                        // Don't flip if clicking on buttons in the header
                        if (e.target.closest('.dashboard-controls')) {
                            return;
                        }
                        card.classList.add('flipped');
                    });
                }
                
                // Click on back to flip to front
                if (backClickable) {
                    backClickable.addEventListener('click', () => {
                        card.classList.remove('flipped');
                    });
                }
            });
        }
    }

    // Initialize flip cards
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new FlipCardManager());
    } else {
        new FlipCardManager();
    }

    // 3D Particle System for futuristic effect
    class ParticleSystem {
        constructor() {
            this.canvas = document.getElementById('particleCanvas');
            if (!this.canvas) return;
            
            this.ctx = this.canvas.getContext('2d');

            this.particles = [];
            this.colors = ['#ff6b6b', '#3b82f6', '#22c55e', '#f59e0b'];

            this._mediaMobile = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
            this._mediaReduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
            this._isMobile = this._mediaMobile ? this._mediaMobile.matches : (window.innerWidth <= 768);
            this._reduceMotion = this._mediaReduceMotion ? this._mediaReduceMotion.matches : false;

            // Performance knobs
            this._connectionsEnabled = !this._isMobile;
            this._targetFps = this._isMobile ? 30 : 60;
            this._frameIntervalMs = 1000 / this._targetFps;
            this._lastFrameMs = 0;
            this._lastTime = 0;

            // 3D params (allow "near" particles to appear larger)
            this._fov = 900;
            this._zNear = -350;
            this._zFar = 1600;

            this.resize();
            this._syncParticleCount();
            this._initParticles();
            this.animate();

            window.addEventListener('resize', () => {
                this.resize();
                this._syncParticleCount(true);
            });

            if (this._mediaMobile && typeof this._mediaMobile.addEventListener === 'function') {
                this._mediaMobile.addEventListener('change', () => {
                    this._isMobile = this._mediaMobile.matches;
                    this._connectionsEnabled = !this._isMobile;
                    this._targetFps = this._isMobile ? 30 : 60;
                    this._frameIntervalMs = 1000 / this._targetFps;
                    this.resize();
                    this._syncParticleCount(true);
                });
            }
            if (this._mediaReduceMotion && typeof this._mediaReduceMotion.addEventListener === 'function') {
                this._mediaReduceMotion.addEventListener('change', () => {
                    this._reduceMotion = this._mediaReduceMotion.matches;
                });
            }
        }
        
        resize() {
            const w = window.innerWidth;
            const h = window.innerHeight;

            // Cap DPR on mobile to keep fill-rate under control.
            const rawDpr = window.devicePixelRatio || 1;
            const dprCap = this._isMobile ? 1.25 : 2;
            this._dpr = Math.min(rawDpr, dprCap);

            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;
            this.canvas.width = Math.floor(w * this._dpr);
            this.canvas.height = Math.floor(h * this._dpr);

            // Draw in CSS pixels (easier math)
            this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);

            this._w = w;
            this._h = h;
        }

        _syncParticleCount(rebuild = false) {
            // Scale particle count to viewport area, then clamp.
            const area = Math.max(1, window.innerWidth * window.innerHeight);
            const densityDivisor = this._isMobile ? 32000 : 26000; // higher = fewer particles
            const base = Math.round(area / densityDivisor);
            const minCount = this._isMobile ? 28 : 65;
            const maxCount = this._isMobile ? 65 : 115;
            this.particleCount = Math.max(minCount, Math.min(maxCount, base));

            if (rebuild) {
                if (this.particles.length > this.particleCount) {
                    this.particles.length = this.particleCount;
                }
                while (this.particles.length < this.particleCount) {
                    this.particles.push(this._createParticle());
                }
            }
        }

        _createParticle() {
            // Particles spawn fully transparent and fade in.
            const margin = 40;
            return {
                x: Math.random() * (this._w + margin * 2) - margin,
                y: Math.random() * (this._h + margin * 2) - margin,
                z: Math.random() * (this._zFar - this._zNear) + this._zNear,

                // velocities in CSS px per second (scaled by dt)
                vx: (Math.random() - 0.5) * (this._isMobile ? 10 : 14),
                vy: (Math.random() - 0.5) * (this._isMobile ? 10 : 14),
                vz: (Math.random() - 0.5) * (this._isMobile ? 55 : 75),

                baseSize: Math.random() * 1.8 + 0.9,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                baseOpacity: Math.random() * 0.35 + 0.18,

                age: 0,
                life: Math.random() * 6 + 6 // seconds
            };
        }

        _respawn(p) {
            const np = this._createParticle();
            p.x = np.x;
            p.y = np.y;
            p.z = np.z;
            p.vx = np.vx;
            p.vy = np.vy;
            p.vz = np.vz;
            p.baseSize = np.baseSize;
            p.color = np.color;
            p.baseOpacity = np.baseOpacity;
            p.age = 0;
            p.life = np.life;
        }
        
        _initParticles() {
            this.particles = [];
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push(this._createParticle());
            }
        }

        _clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        _smoothstep(edge0, edge1, x) {
            const t = this._clamp((x - edge0) / (edge1 - edge0), 0, 1);
            return t * t * (3 - 2 * t);
        }
        
        animate(nowMs = 0) {
            requestAnimationFrame((t) => this.animate(t));

            if (this._reduceMotion) {
                // Respect reduced motion; keep background static.
                this.ctx.clearRect(0, 0, this._w, this._h);
                return;
            }

            // FPS throttling (important on mobile)
            if (this._lastFrameMs && (nowMs - this._lastFrameMs) < this._frameIntervalMs) return;
            this._lastFrameMs = nowMs;

            const dt = this._lastTime ? Math.min(0.05, (nowMs - this._lastTime) / 1000) : (1 / this._targetFps);
            this._lastTime = nowMs;

            this.ctx.clearRect(0, 0, this._w, this._h);

            const cx = this._w / 2;
            const cy = this._h / 2;
            const margin = 60;

            // Precompute projected points for connection drawing.
            const projected = new Array(this.particles.length);

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];

                p.age += dt;

                // Fade-in / fade-out via lifecycle
                const tLife = p.life > 0 ? (p.age / p.life) : 1;
                if (tLife >= 1) {
                    this._respawn(p);
                }

                // Move
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;

                // Recycle when leaving bounds/depth instead of hard wrapping (prevents popping)
                if (
                    p.x < -margin || p.x > this._w + margin ||
                    p.y < -margin || p.y > this._h + margin ||
                    p.z < this._zNear || p.z > this._zFar
                ) {
                    this._respawn(p);
                }

                const scale = this._fov / (this._fov + p.z);
                const x2d = (p.x - cx) * scale + cx;
                const y2d = (p.y - cy) * scale + cy;

                // Larger when "closer": allow scale > 1 when z < 0
                const radius = Math.min(11, p.baseSize * scale * 2);

                // Smooth fade in/out (no popping)
                const fadeIn = this._smoothstep(0.0, 0.18, tLife);
                const fadeOut = 1 - this._smoothstep(0.82, 1.0, tLife);
                const fade = fadeIn * fadeOut;

                // Slightly brighten closer particles without overdoing it
                const depthBoost = this._clamp(scale, 0.35, 1.35);
                const alpha = p.baseOpacity * fade * this._clamp(depthBoost, 0.35, 1.0);

                projected[i] = { x: x2d, y: y2d, z: p.z, r: radius, a: alpha, c: p.color };

                if (alpha <= 0.001) continue;

                this.ctx.beginPath();
                this.ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = alpha;
                this.ctx.fill();
            }

            if (this._connectionsEnabled) {
                const maxDist = 150;
                const maxDist2 = maxDist * maxDist;
                const maxDz = 240;

                for (let i = 0; i < projected.length; i++) {
                    const a = projected[i];
                    if (!a || a.a <= 0.03) continue;

                    for (let j = i + 1; j < projected.length; j++) {
                        const b = projected[j];
                        if (!b || b.a <= 0.03) continue;
                        if (Math.abs(a.z - b.z) > maxDz) continue;

                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 > maxDist2) continue;

                        const dist = Math.sqrt(d2);
                        const lineAlpha = (1 - dist / maxDist) * 0.14 * Math.min(a.a, b.a);
                        if (lineAlpha <= 0.001) continue;

                        this.ctx.beginPath();
                        this.ctx.moveTo(a.x, a.y);
                        this.ctx.lineTo(b.x, b.y);
                        this.ctx.strokeStyle = a.c;
                        this.ctx.globalAlpha = lineAlpha;
                        this.ctx.lineWidth = 0.6;
                        this.ctx.stroke();
                    }
                }
            }

            this.ctx.globalAlpha = 1;
        }
    }
    
    // Initialize particle system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ParticleSystem());
    } else {
        new ParticleSystem();
    }

})();
