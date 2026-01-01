/**
 * simulator.js
 * Logic for the Creator Growth Decision Simulator.
 */

(function () {
    'use strict';

    const CHAPTERS = [
        {
            id: 'turnaround',
            title: 'Turnaround Time',
            text: 'Editing is eating your week. You can post, but you can’t iterate fast enough to learn what works.',
            choices: [
                {
                    title: 'Keep DIY (but simplify the workflow)',
                    text: 'You batch edit, reuse templates, and ship more consistently. No extra spend, but your ceiling is still your time.',
                    effect: { followers: 1400, views: 7000, engagement: 1, income: 0, brand: 2, fans: 12, costs: [] }
                },
                {
                    title: 'Hire an editor for turnaround',
                    text: 'You stay in your lane (shooting + ideas). More tests, faster feedback loops. Costs money and requires clear briefs.',
                    effect: { followers: 3600, views: 16000, engagement: 0, income: -600, brand: 6, fans: 10, costs: [{ name: 'Editor', val: -600 }] }
                }
            ]
        },
        {
            id: 'photography',
            title: 'Photography That Sells',
            text: 'Your videos perform okay, but your profile grid, thumbnails, and product shots don’t build trust at a glance.',
            choices: [
                {
                    title: 'DIY photos with constraints',
                    text: 'Phone + window light + one clean background. Not “luxury”, but consistent and believable if you keep it simple.',
                    effect: { followers: 900, views: 2500, engagement: 1, income: 150, brand: 3, fans: 6, costs: [] }
                },
                {
                    title: 'Book a focused photo session',
                    text: 'A short pro session for hero images + profile + a few versatile “campaign-ready” shots. Improves perceived value and conversion.',
                    effect: { followers: 1800, views: 4500, engagement: 2, income: 650, brand: 12, fans: 14, costs: [{ name: 'Photography', val: -450 }] }
                }
            ]
        },
        {
            id: 'video_day',
            title: 'Video Quality vs Throughput',
            text: 'You can either ship more often, or craft fewer pieces with higher production value. Both can work, depending on your goals.',
            choices: [
                {
                    title: 'Keep it simple (fast to ship)',
                    text: 'Talking head + clean framing. You stay consistent and learn faster, but you won’t stand out on visuals alone.',
                    effect: { followers: 1600, views: 9000, engagement: 1, income: 250, brand: 2, fans: 10, costs: [] }
                },
                {
                    title: 'Do one pro video day per month',
                    text: 'Lighting + clean audio + b-roll. Gives you a few “hero” pieces that set the tone for your brand. If you don’t plan, it’s wasted spend.',
                    effect: { followers: 2600, views: 16000, engagement: 3, income: 200, brand: 14, fans: 18, costs: [{ name: 'Video Day', val: -900 }] }
                }
            ]
        },
        {
            id: 'audio',
            title: 'Audio is Trust',
            text: 'Viewers forgive average video. They don’t forgive echo, wind noise, or quiet voices. Audio quietly drives retention.',
            choices: [
                {
                    title: 'Ignore it for now',
                    text: 'You keep moving fast, but drop-off stays high and comments start to mention “can’t hear you”.',
                    effect: { followers: 300, views: 1500, engagement: -2, income: 0, brand: -2, fans: -2, costs: [] }
                },
                {
                    title: 'Get clean audio (kit or engineer)',
                    text: 'A simple mic setup + room treatment (or a pro on shoot days). More watch time, more trust, fewer “what?” moments.',
                    effect: { followers: 1200, views: 6500, engagement: 4, income: 150, brand: 6, fans: 8, costs: [{ name: 'Audio', val: -150 }] }
                }
            ]
        },
        {
            id: 'studio_spend',
            title: 'The Spend Trap (or the Breakthrough)',
            text: 'You consider renting a studio. Done right, it unlocks consistency. Done wrong, it becomes an expensive photo day with nothing usable.',
            choices: [
                {
                    title: 'Studio day without real pre-production',
                    text: 'You wing it. You get “pretty footage”, but it doesn’t map to a strategy. Time + money burned.',
                    effect: { followers: -400, views: -1500, engagement: -1, income: -300, brand: -3, fans: -4, costs: [{ name: 'Studio (wasted)', val: -600 }] }
                },
                {
                    title: 'Plan + execute a targeted studio shoot',
                    text: 'Shot list, wardrobe, key messages, and deliverables. You walk out with a month of assets that actually convert.',
                    effect: { followers: 2100, views: 12000, engagement: 2, income: 450, brand: 10, fans: 12, costs: [{ name: 'Studio', val: -600 }] }
                }
            ]
        },
        {
            id: 'broll',
            title: 'B-roll & Storytelling',
            text: 'Your content has good info, but it feels “flat”. You can add visual storytelling, or keep it minimal.',
            choices: [
                {
                    title: 'Minimal visuals (talking head only)',
                    text: 'Simple and fast. Works if your ideas are strong, but it’s harder to rewatch and share.',
                    effect: { followers: 900, views: 5500, engagement: 0, income: 150, brand: 1, fans: 6, costs: [] }
                },
                {
                    title: 'Add planned b-roll (shot list + coverage)',
                    text: 'A little planning makes the edit feel premium. Better retention and stronger brand association.',
                    effect: { followers: 1700, views: 10500, engagement: 2, income: 200, brand: 8, fans: 10, costs: [] }
                }
            ]
        },
        {
            id: 'proof',
            title: 'Proof for Brands',
            text: 'A brand asks: “Can you deliver something that looks like us?” Your answer can be a PDF… or a produced sample.',
            choices: [
                {
                    title: 'Pitch with stats + personality',
                    text: 'You keep it lean. Great when the brand already trusts you, but you’ll lose deals that require polish.',
                    effect: { followers: 800, views: 4000, engagement: 1, income: 350, brand: 2, fans: 4, costs: [] }
                },
                {
                    title: 'Produce a polished “spec” sample',
                    text: 'One short sample spot + BTS. This can unlock better deals, but only if you actually use it to pitch.',
                    effect: { followers: 1500, views: 7500, engagement: 1, income: 900, brand: 14, fans: 8, costs: [{ name: 'Spec Production', val: -700 }] }
                }
            ]
        },
        {
            id: 'retainer',
            title: 'How You Scale Production',
            text: 'You’re at the point where consistency and quality both matter. Do you keep ad-hoc spending, or build a repeatable system?',
            choices: [
                {
                    title: 'Ad-hoc spending and random upgrades',
                    text: 'Some months you spend, some months you don’t. Harder to build momentum and a consistent look.',
                    effect: { followers: 700, views: 3500, engagement: 0, income: 100, brand: 1, fans: 4, costs: [] }
                },
                {
                    title: 'Repeatable monthly production package',
                    text: 'A predictable cadence (photo + video) you can plan around. More consistency, less decision fatigue, but it’s a real commitment.',
                    effect: { followers: 2400, views: 14000, engagement: 2, income: 250, brand: 16, fans: 14, costs: [{ name: 'Production Package', val: -1200 }] }
                }
            ]
        },
        {
            id: 'end',
            title: 'Results (Not a Promise)',
            text: 'This is a simplified simulator. The point is to see tradeoffs: time vs quality vs clarity vs cost.',
            choices: [] // End state
        }
    ];

    class CreatorSimulator {
        constructor() {
            this.initialState = {
                followers: 1000, // Start with some base
                views: 5000,
                engagement: 5,
                income: 0,
                brand: 0,
                fans: 0,
                costs: [],
                historyByStep: [1000]
            };
            
            this.state = { ...this.initialState };
            this.choices = new Array(CHAPTERS.length).fill(null); // Track selected choice index per chapter
            this.previewData = null; // For hover preview
            
            this.els = {};
        }

        init() {
            this.cacheElements();
            this.bindEvents();
            
            if (this.els.container) {
                this.updateDashboard();
            }
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
            if (this.els.hero) {
                this.els.hero.style.display = 'none';
            }
            this.renderAllChapters();
        }

        reset() {
            this.state = JSON.parse(JSON.stringify(this.initialState));
            this.choices.fill(null);
            this.updateDashboard();
            
            if (this.els.hero) {
                this.els.hero.style.display = 'block';
                this.els.hero.style.animation = 'fadeIn 0.5s ease';
            }
            this.els.container.innerHTML = '';
        }

        recalculateState() {
            // Reset to initial
            this.state = JSON.parse(JSON.stringify(this.initialState));
            this.state.costs = []; // Ensure costs is reset
            const totalDecisions = CHAPTERS.length - 1;
            this.state.historyByStep = new Array(totalDecisions + 1).fill(this.initialState.followers);
            this.state.historyByStep[0] = this.initialState.followers;
            
            // Replay all choices
            for (let chapterIndex = 0; chapterIndex < totalDecisions; chapterIndex++) {
                const choiceIndex = this.choices[chapterIndex];
                
                const chapter = CHAPTERS[chapterIndex];
                if (!chapter || !chapter.choices) return;
                
                const choice = chapter.choices[choiceIndex];
                if (!choice) {
                    this.state.historyByStep[chapterIndex + 1] = this.state.followers;
                    continue;
                }

                // Apply effects
                this.state.followers += choice.effect.followers;
                this.state.views += choice.effect.views;
                this.state.engagement = Math.min(100, Math.max(0, this.state.engagement + choice.effect.engagement));
                this.state.income += choice.effect.income;
                this.state.brand = Math.min(100, Math.max(0, this.state.brand + choice.effect.brand));
                this.state.fans += choice.effect.fans;
                
                if (choice.effect.costs && choice.effect.costs.length > 0) {
                    this.state.costs.push(...choice.effect.costs);
                }

                this.state.historyByStep[chapterIndex + 1] = this.state.followers;
            }

            this.updateDashboard();
            
            // Check if all choices made, then show end screen
            const allChoicesMade = this.choices.slice(0, -1).every(c => c !== null);
            if (allChoicesMade) {
                const endExists = document.getElementById(`chapter-${CHAPTERS.length - 1}`);
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

        renderAspectsTable() {
            if (!this.els.aspectTableBody) return;

            const totalDecisions = CHAPTERS.length - 1;
            const tbody = this.els.aspectTableBody;
            tbody.innerHTML = '';

            const currentCost = this.getCurrentMonthlyCost();

            const currentRow = document.createElement('tr');
            currentRow.className = 'current-row';
            currentRow.innerHTML = `
                <td>Current</td>
                <td>${this.formatNumber(this.state.followers)}</td>
                <td>${this.formatNumber(this.state.views)}</td>
                <td>${this.formatNumber(this.state.fans)}</td>
                <td>${this.formatSignedMoney(currentCost)}</td>
                <td>$${this.formatNumber(this.state.income)}</td>
            `;
            tbody.appendChild(currentRow);

            for (let i = 0; i < totalDecisions; i++) {
                const choiceIdx = this.choices[i];
                if (choiceIdx === null) continue;
                const chapter = CHAPTERS[i];
                const choice = chapter.choices[choiceIdx];
                if (!choice) continue;

                const row = document.createElement('tr');
                const e = choice.effect;

                const costDelta = this.getChoiceMonthlyCost(choice); // typically negative for spend
                const hasMeaningfulUpside =
                    (e.followers || 0) > 0 ||
                    (e.views || 0) > 0 ||
                    (e.engagement || 0) > 0 ||
                    (e.fans || 0) > 0 ||
                    (e.income || 0) > 0;

                const clsF = e.followers > 0 ? 'delta-pos' : e.followers < 0 ? 'delta-neg' : '';
                const clsV = e.views > 0 ? 'delta-pos' : e.views < 0 ? 'delta-neg' : '';
                const clsFans = e.fans > 0 ? 'delta-pos' : e.fans < 0 ? 'delta-neg' : '';
                const clsInc = e.income > 0 ? 'delta-pos' : e.income < 0 ? 'delta-neg' : '';
                const clsCost =
                    costDelta < 0
                        ? (hasMeaningfulUpside ? 'delta-cost-good' : 'delta-cost-bad')
                        : costDelta > 0
                            ? 'delta-pos'
                            : '';

                row.innerHTML = `
                    <td>${i + 1}. ${chapter.title}</td>
                    <td class="${clsF}">${this.formatSignedCompact(e.followers)}</td>
                    <td class="${clsV}">${this.formatSignedCompact(e.views)}</td>
                    <td class="${clsFans}">${this.formatSignedCompact(e.fans)}</td>
                    <td class="${clsCost}">${this.formatSignedMoney(costDelta)}</td>
                    <td class="${clsInc}">${this.formatSignedMoney(e.income)}</td>
                `;

                tbody.appendChild(row);
            }
        }

        renderAllChapters() {
            this.els.container.innerHTML = '';
            
            // Render ALL chapters at once (except the end screen until all choices made)
            CHAPTERS.forEach((chapter, index) => {
                const isEnd = index === CHAPTERS.length - 1;
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
                                <h4>${choice.title}</h4>
                                <p>${choice.text}</p>
                            </button>
                        `;
                    });
                    html += `</div>`;
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
            // Update choice
            this.choices[chapterIndex] = choiceIndex;
            this.recalculateState();
            this.updateAllChaptersUI();
        }

        updateAllChaptersUI() {
            // Update which buttons are active without re-rendering everything
            CHAPTERS.forEach((chapter, index) => {
                const selectedChoice = this.choices[index];
                const btns = document.querySelectorAll(`#chapter-${index} .choice-btn`);
                btns.forEach((btn, i) => {
                    if (selectedChoice === i) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
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
            const chapter = CHAPTERS[chapterIndex];
            if (!chapter || !chapter.choices) return;
            const choice = chapter.choices[choiceIndex];
            if (!choice) return;

            const totalDecisions = CHAPTERS.length - 1;
            if (chapterIndex < 0 || chapterIndex >= totalDecisions) return;

            const fromFollowers = (this.state.historyByStep && this.state.historyByStep[chapterIndex] != null)
                ? this.state.historyByStep[chapterIndex]
                : this.initialState.followers;

            const toFollowers = fromFollowers + choice.effect.followers;

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

        updateDashboard() {
            this.renderAspectsTable();
            this.updateChart();
        }

        updateChart() {
            if (!this.els.chart) return;
            
            const totalChapters = CHAPTERS.length - 1; // Exclude end
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
            const padding = 20;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding;
            
            // Calculate theoretical maximum followers (best possible path)
            let theoreticalMax = this.initialState.followers;
            for (let i = 0; i < totalChapters; i++) {
                const chapter = CHAPTERS[i];
                if (chapter && chapter.choices && chapter.choices.length > 0) {
                    const maxGain = Math.max(...chapter.choices.map(c => c.effect.followers || 0));
                    theoreticalMax += maxGain;
                }
            }

            // Use absolute follower values with scale from 0 to theoretical max
            const minFollowers = 0;
            const maxFollowers = theoreticalMax;
            const range = maxFollowers - minFollowers || 1;

            // Generate main path
            let pathD = '';
            let circles = '';
            
            plottedData.forEach((val, i) => {
                const x = padding + (i / totalChapters) * chartWidth;
                const y = height - padding - (((val - minFollowers) / range) * chartHeight);
                
                if (i === 0) {
                    pathD = `M ${x} ${y}`;
                } else {
                    pathD += ` L ${x} ${y}`;
                }
                
                // Add dot for each data point
                circles += `<circle cx="${x}" cy="${y}" r="5" fill="#3b82f6" filter="url(#glow)" />`;
            });

            // Fill area under the line
            const lastX = padding + ((plottedData.length - 1) / totalChapters) * chartWidth;
            const fillD = pathD + ` L ${lastX} ${height - padding} L ${padding} ${height - padding} Z`;

            // Preview line (greyed out potential)
            let previewPath = '';
            let previewCircle = '';
            if (this.previewData) {
                const fromStep = this.previewData.fromStep;
                const fromX = padding + (fromStep / totalChapters) * chartWidth;
                const toX = padding + ((fromStep + 1) / totalChapters) * chartWidth;
                const fromY = height - padding - (((this.previewData.fromFollowers - minFollowers) / range) * chartHeight);
                const toY = height - padding - (((this.previewData.toFollowers - minFollowers) / range) * chartHeight);

                previewPath = `<path d="M ${fromX} ${fromY} L ${toX} ${toY}" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="5,5" />`;
                previewCircle = `<circle cx="${toX}" cy="${toY}" r="4" fill="#666" />`;
            }

            // Axis lines
            const axisLines = `
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="1" />
                <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="1" />
            `;

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
                ${axisLines}
                <path d="${fillD}" fill="url(#chartGradient)" stroke="none" />
                <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" filter="url(#glow)" />
                ${circles}
                ${previewPath}
                ${previewCircle}
            `;
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
    }

    // Expose to global scope for app.js to handle
    window.CreatorSimulator = new CreatorSimulator();

})();
