/**
 * simulator.js
 * Logic for the Creator Growth Decision Simulator.
 */

(function () {
    'use strict';

    // Core simulator class managing the chapter-based decision tree.
    // Each chapter presents a scenario with multiple choices, each choice affects growth metrics.
    // The simulator tracks state across all decisions and calculates cumulative effects.
    class CreatorSimulator {
        constructor() {
            // Chapter-based decision tree: Each chapter = one decision point with multiple choice options.
            // Loaded from CSV with questions, choices, and their growth/cost effects.
            this.chapters = []; // Loaded from CSV
            this.userStartingFollowers = 1000; // Default, will be overridden
            
            // State tracking: Tracks all key creator metrics throughout the simulation.
            // - followers: Total follower count (main growth metric)
            // - views: Monthly views (engagement indicator)
            // - engagement: Engagement rate as percentage points (0-100)
            // - income: Monthly revenue in dollars
            // - subscribers: Paid subscriber count
            // - costs: Array of recurring monthly costs {name, val}
            // - historyByStep: Follower count snapshot after each decision (used for chart rendering)
            this.initialState = {
                followers: 1000, // Start with some base
                views: 5000,
                engagement: 5,
                income: 0,
                subscribers: 0,
                costs: [],
                historyByStep: [1000]
            };
            
            this.state = { ...this.initialState };
            // Track selected choice index per chapter (null = no choice yet).
            this.choices = []; // Track selected choice index per chapter
            
            // Preview system: Hover to see impact of a choice before committing.
            // Shows a dashed preview line on the chart.
            this.previewData = null; // For hover preview

            // Animation state tracking: Coordinates smooth transitions when choices are made.
            // These flags prevent race conditions between chart animation, row animation, and highlight application.
            this._pendingChartAnim = null; // { fromStep, toStep } - triggers chart segment animation
            this._pendingHighlightChapter = null; // Which chapter index is currently animating (only that row delays highlights)
            this._pendingDecisionAnim = null; // { chapterIndex, from, to } - decision row count-up animation data
            
            this.els = {};
        }

        getLastAnsweredStep() {
            const totalChapters = this.chapters.length - 1;
            let lastAnsweredStep = 0;
            for (let i = 0; i < totalChapters; i++) {
                if (this.choices[i] !== null) lastAnsweredStep = i + 1;
            }
            return lastAnsweredStep;
        }

        cloneTotalsSnapshot() {
            return {
                followers: this.state.followers,
                views: this.state.views,
                subscribers: this.state.subscribers,
                income: this.state.income,
                cost: this.getCurrentMonthlyCost()
            };
        }

        // Decision animation system: Smooth count-up effect when a choice is made.
        // 
        // Animation flow (750ms + 200ms = 950ms total):
        // 1. New choice is selected → old values stored
        // 2. Table row is re-rendered with data-final-class attributes (green highlights delayed)
        // 3. This function animates from old values to new values over 950ms
        // 4. Uses cubic ease-out for natural deceleration
        // 5. After animation completes, applyDelayedHighlights() reveals green best-choice highlights
        // 
        // Why 950ms? Slower transitions feel more premium and give users time to absorb the impact.
        animateDecisionRow(anim, done) {
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

            const duration = 950; // 750ms transition + 200ms buffer for polish
            const start = performance.now();
            const from = anim.from;
            const to = anim.to;

            const fmtSignedCompactSpaced = (n) => this.formatSignedCompact(Math.round(n)).replace(/(\d)([KMB])/g, '$1 $2');
            const fmtSignedMoneySpaced = (n) => this.formatSignedMoney(Math.round(n)).replace(/([+\-$])(\d)/, '$1 $2').replace(/(\d)([KMB])/g, '$1 $2');

            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = 1 - Math.pow(1 - t, 3);
                const lerp = (a, b) => a + (b - a) * ease;

                const followers = lerp(from.followersDelta, to.followersDelta);
                const views = lerp(from.viewsDelta, to.viewsDelta);
                const subscribers = lerp(from.subscribersDelta, to.subscribersDelta);
                const cost = lerp(from.costDelta, to.costDelta);
                const income = lerp(from.incomeDelta, to.incomeDelta);

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

        // Delayed highlight application: Apply green "best choice" highlighting after animations complete.
        // Why needed: If we apply green immediately, it flashes during the count-up animation.
        // Instead, we store the final class in data-final-class and apply it after the 750ms transition.
        // This creates a polished reveal effect: numbers count up → burst animation → green highlight appears.
        applyDelayedHighlights() {
            const tbody = this.els.aspectTableBody;
            if (!tbody) return;
            const delayed = tbody.querySelectorAll('[data-final-class]');
            delayed.forEach((el) => {
                const cls = el.getAttribute('data-final-class');
                if (cls) el.classList.add(cls);
                el.removeAttribute('data-final-class');
            });
        }

        /**
         * Growth multiplier math: Exponential scaling for realistic account growth.
         * 
         * Why exponential scaling?
         * - Small accounts (1K followers): Decisions have smaller absolute impact but higher % growth.
         * - Large accounts (100K+ followers): Decisions have larger absolute impact but lower % growth.
         * - Formula: (followers / 35000) ^ 0.57
         * 
         * The 0.57 exponent was chosen through testing to balance:
         * - At 1K followers: multiplier ≈ 0.1 (10% of base effect)
         * - At 35K followers: multiplier = 1.0 (100% of base effect)
         * - At 200K followers: multiplier ≈ 2.4 (240% of base effect)
         * 
         * This creates realistic growth curves where early decisions matter but later decisions
         * scale appropriately with audience size (e.g., hiring an editor has more impact at 100K than 1K).
         */
        getGrowthMultiplier(baseFollowers) {
            // Balanced exponential scaling: reasonable % growth at small scale, meaningful absolute at large scale
            const followers = Math.max(baseFollowers, 1000);
            const multiplier = Math.pow(followers / 35000, 0.57);
            
            // Clamp to reasonable bounds (minimum 0.1x for very small accounts, max 500x for edge cases)
            return Math.max(0.1, Math.min(500.0, multiplier));
        }

        // Percent vs absolute growth effects:
        // CSV stores effects as percentages (e.g., 0.05 = 5% follower growth).
        // To maintain exponential scaling consistency, we need a dampening factor.
        // 
        // Formula: (35000 / followers) ^ 0.43
        // This ensures: Pct * Followers * PercentMultiplier = Base * (Followers/35k) ^ 0.57
        // 
        // Why 0.43? It's calculated so percent-based effects scale inversely to absolute effects.
        // As account grows, percent multiplier decreases (dampening) while absolute multiplier increases.
        getPercentMultiplier(baseFollowers) {
            // Dampening factor for percentages as account grows
            // Formula: (35000 / followers)^0.43
            // This ensures that if we apply Pct * Followers * Multiplier, it matches the old Base * (F/35k)^0.57
            const followers = Math.max(baseFollowers, 1000);
            const multiplier = Math.pow(35000 / followers, 0.43);
            return multiplier;
        }

        // Scale effect based on current account size.
        // Takes raw percentages from CSV and converts them to scaled absolute values.
        // 
        // Cost accumulation logic:
        // - Monthly costs (e.g., software subscriptions, team salaries) are recurring.
        // - One-time costs could be added but are currently all monthly in the CSV.
        // - Costs scale with account size (hiring an editor costs more for 100K vs 1K account).
        // - All costs accumulate in state.costs array and sum to show total monthly burn rate.
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
                engagement: effect.engagement, // Keep engagement as-is (absolute points, not scaled)
                income: Math.round(currentFollowers * effect.incomePct * pctMultiplier),
                subscribers: Math.round(currentFollowers * effect.subscribersPct * pctMultiplier),
                costs: scaledCosts
            };
        }

        async init() {
            this.cacheElements();
            await this.loadData();
            this.bindEvents();
            
            if (this.els.container) {
                this.updateDashboard();
            }

            // Bind follower input
            const followerInput = document.getElementById('startingFollowers');
            const startBtn = document.getElementById('startSimBtn');
            if (followerInput && startBtn) {
                followerInput.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 100) {
                        startBtn.disabled = false;
                    } else {
                        startBtn.disabled = true;
                    }
                });
            }
        }

        async loadData() {
            try {
                const response = await fetch('data/chapters.csv');
                const text = await response.text();
                const rows = this.parseCSV(text);
                this.processChapters(rows);
            } catch (e) {
                console.error("Failed to load chapters", e);
            }
        }

        // CSV parsing logic with proper quote handling.
        // 
        // Why custom parser instead of library?
        // - Need to handle multi-line text fields in CSV (e.g., long explanations with line breaks).
        // - CSV standard: Fields can be quoted with " to allow commas and newlines inside.
        // - Escaped quotes: "" inside quoted field becomes a single " character.
        // 
        // Algorithm:
        // 1. Track insideQuote state to know if we're inside a quoted field.
        // 2. Only treat commas and newlines as delimiters when NOT inside quotes.
        // 3. Handle escaped quotes (two consecutive quotes "" = literal quote character).
        // 4. Build rows array where each row is an array of field values.
        parseCSV(text) {
            const rows = [];
            let currentRow = [];
            let currentVal = '';
            let insideQuote = false;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i+1];
                
                // Quote handling: Toggle insideQuote state, or handle escaped quotes
                if (char === '"') {
                    if (insideQuote && nextChar === '"') {
                        // Escaped quote: "" becomes "
                        currentVal += '"';
                        i++; // Skip next quote
                    } else {
                        // Regular quote: Toggle insideQuote state
                        insideQuote = !insideQuote;
                    }
                } else if (char === ',' && !insideQuote) {
                    // Field delimiter (only outside quotes)
                    currentRow.push(currentVal);
                    currentVal = '';
                } else if ((char === '\n' || char === '\r') && !insideQuote) {
                    // Row delimiter (only outside quotes)
                    if (currentVal || currentRow.length > 0) {
                        currentRow.push(currentVal);
                        rows.push(currentRow);
                        currentRow = [];
                        currentVal = '';
                    }
                } else {
                    // Regular character: Add to current field value
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
            // Headers: Step,Variation,Type,Title,Text,Followers,Views,Engagement,Income,Subscribers,CostName,CostVal,Explanation
            // Skip header row
            const dataRows = rows.slice(1);
            
            const chaptersMap = new Map(); // Step -> { variations: Map(VarID -> { question: {}, choices: [] }) }

            dataRows.forEach(row => {
                if (row.length < 5) return;
                const step = parseInt(row[0]);
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
                        engagement: parseInt(row[7]) || 0,
                        incomePct: parseFloat(row[8]) || 0,
                        subscribersPct: parseFloat(row[9]) || 0,
                        costs: []
                    };
                    
                    if (row[10] && row[11]) {
                        effect.costs.push({ name: row[10], val: parseInt(row[11]) || 0 });
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

        // Preview system: Hover to see impact before committing to a choice.
        // 
        // How it works:
        // 1. Mouse enters a choice button → showPreview() is called
        // 2. Calculate scaled effect at that specific step (not current total)
        // 3. Store preview data (fromStep, fromFollowers, toFollowers)
        // 4. updateChart() renders a dashed grey line showing potential growth
        // 5. Mouse leaves → hidePreview() clears preview and restores normal chart
        // 
        // Why useful? Users can compare options visually before making a decision.
        // Dashed line is non-committal and clearly distinguishes preview from actual progress.
        showPreview(chapterIndex, choiceIndex) {
            const chapter = this.chapters[chapterIndex];
            if (!chapter || !chapter.choices) return;
            const choice = chapter.choices[choiceIndex];
            if (!choice) return;

            const totalDecisions = this.chapters.length - 1;
            if (chapterIndex < 0 || chapterIndex >= totalDecisions) return;

            // Get follower count at the time this decision would be made
            const fromFollowers = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;

            // Scale the effect based on current followers at that step (not final total)
            const scaledEffect = this.scaleEffect(choice.effect, fromFollowers);
            const toFollowers = fromFollowers + scaledEffect.followers;

            // Store preview data for chart rendering
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

            // Chart animation logic: Animate only the newest segment growing from previous point.
            // 
            // Animation approach:
            // 1. Render static path up to the previous step
            // 2. Add animated segment using stroke-dasharray/stroke-dashoffset trick
            // 3. Segment grows over 700ms with CSS animation
            // 4. Burst ring appears at the end point (delayed by segDurationMs)
            // 5. After animation, re-render chart to final static state
            // 
            // Why segment-only animation? Animating the full path is jarring when changing past decisions.
            // Only animating the new/changed segment feels responsive and focused.
            let pathD = '';
            let circles = '';
            let animSegment = '';
            let burst = '';

            const segDurationMs = 700; // Segment growth duration in milliseconds
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
            this.particleCount = 80;
            this.colors = ['#ff6b6b', '#3b82f6', '#22c55e', '#f59e0b'];
            
            this.resize();
            this.init();
            this.animate();
            
            window.addEventListener('resize', () => this.resize());
        }
        
        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        
        init() {
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    z: Math.random() * 1000,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    vz: (Math.random() - 0.5) * 2,
                    size: Math.random() * 2 + 1,
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    opacity: Math.random() * 0.5 + 0.2
                });
            }
        }
        
        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.particles.forEach(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;
                
                // Wrap around edges
                if (p.x < 0) p.x = this.canvas.width;
                if (p.x > this.canvas.width) p.x = 0;
                if (p.y < 0) p.y = this.canvas.height;
                if (p.y > this.canvas.height) p.y = 0;
                if (p.z < 0) p.z = 1000;
                if (p.z > 1000) p.z = 0;
                
                // 3D perspective
                const scale = 1000 / (1000 + p.z);
                const x2d = (p.x - this.canvas.width / 2) * scale + this.canvas.width / 2;
                const y2d = (p.y - this.canvas.height / 2) * scale + this.canvas.height / 2;
                const size = p.size * scale;
                
                // Draw particle
                this.ctx.beginPath();
                this.ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.opacity * scale;
                this.ctx.fill();
                
                // Draw connections to nearby particles
                this.particles.forEach(p2 => {
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 150 && Math.abs(p.z - p2.z) < 200) {
                        const scale2 = 1000 / (1000 + p2.z);
                        const x2d2 = (p2.x - this.canvas.width / 2) * scale2 + this.canvas.width / 2;
                        const y2d2 = (p2.y - this.canvas.height / 2) * scale2 + this.canvas.height / 2;
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(x2d, y2d);
                        this.ctx.lineTo(x2d2, y2d2);
                        this.ctx.strokeStyle = p.color;
                        this.ctx.globalAlpha = (1 - dist / 150) * 0.15 * scale;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.stroke();
                    }
                });
            });
            
            this.ctx.globalAlpha = 1;
            requestAnimationFrame(() => this.animate());
        }
    }
    
    // Initialize particle system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ParticleSystem());
    } else {
        new ParticleSystem();
    }

})();
