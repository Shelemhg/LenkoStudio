/**
 * ADAM - TikTok AI Growth Manager
 * Home Page Functionality
 */

(function() {
    'use strict';

    // Update footer year
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Challenge Selector Logic (AI Agent Version)
    const challengeCards = document.querySelectorAll('.adam-challenge-card');
    const aiAgent = document.getElementById('ai-agent');
    const aiStatus = document.getElementById('ai-status');
    const solutionOutput = document.getElementById('solution-output');

    const responses = {
        growth: {
            icon: "📉",
            title: "Why You're Not Growing",
            summary: "You’re posting without a feedback loop. ADAM helps you spot what correlates with growth and what to fix fast.",
            content: `
                <p><strong>The Problem:</strong> Without a feedback loop, consistency doesn’t turn into learning.</p>
                <p><strong>What ADAM does:</strong></p>
                <ul>
                    <li>Highlights what correlates with follower growth (not just views)</li>
                    <li>Surfaces repeatable patterns across your posts</li>
                    <li>Helps you act during the first-hour window</li>
                </ul>
            `
        },
        confusion: {
            icon: "🤷",
            title: "Why You Feel Lost",
            summary: "TikTok gives metrics, not a playbook. ADAM turns your past posts into a simple strategy you can repeat.",
            content: `
                <p><strong>The Problem:</strong> TikTok gives metrics, but not a clear playbook.</p>
                <p><strong>What ADAM does:</strong></p>
                <ul>
                    <li>Finds which hooks and formats keep attention</li>
                    <li>Shows which topics and structures your audience rewards</li>
                    <li>Gives you the next best experiment to run</li>
                </ul>
            `
        },
        consistency: {
            icon: "📅",
            title: "Why Consistency Feels Impossible",
            summary: "Motivation fades. Systems don’t. ADAM gives you missions you can complete and learn from.",
            content: `
                <p><strong>The Problem:</strong> Motivation is unpredictable, especially when results feel random.</p>
                <p><strong>What ADAM does:</strong></p>
                <ul>
                    <li>Turns your best formats into a repeatable plan</li>
                    <li>Breaks the week into small, winnable missions</li>
                    <li>Tracks progress and highlights what improved</li>
                </ul>
            `
        }
    };

    let isProcessing = false;

    challengeCards.forEach(card => {
        card.addEventListener('click', async () => {
            if (isProcessing || card.classList.contains('selected')) return;

            // Deselect others immediately
            challengeCards.forEach(c => c.classList.remove('selected'));

            isProcessing = true;

            const challenge = card.dataset.challenge;

            // 1. Create Ghost Card
            const rect = card.getBoundingClientRect();
            const ghost = card.cloneNode(true);
            ghost.classList.add('ghost-card');
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.top = rect.top + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.margin = '0';
            document.body.appendChild(ghost);

            // Hide original
            card.style.opacity = '0';

            // 2. Animate to AI Agent
            const aiRect = aiAgent.getBoundingClientRect();
            const aiCenterX = aiRect.left + aiRect.width / 2;
            const aiCenterY = aiRect.top + aiRect.height / 2;

            // Move ghost to center of AI
            requestAnimationFrame(() => {
                ghost.style.top = (aiCenterY - rect.height / 2) + 'px';
                ghost.style.left = (aiCenterX - rect.width / 2) + 'px';
                ghost.classList.add('shrinking'); // Scale down
            });

            // 3. AI Processing
            aiStatus.textContent = "Analyzing pattern...";
            await new Promise(r => setTimeout(r, 800)); // Wait for fly in

            aiAgent.classList.add('processing');
            ghost.style.opacity = '0'; // Ensure it's gone

            await new Promise(r => setTimeout(r, 1500)); // Processing time

            // 4. Return Ghost (Reverse)
            aiAgent.classList.remove('processing');
            aiStatus.textContent = "Solution generated.";

            ghost.classList.remove('shrinking');
            ghost.classList.add('returning');
            ghost.style.opacity = '1';
            ghost.style.top = rect.top + 'px';
            ghost.style.left = rect.left + 'px';

            // 5. Show Solution Card (Simultaneously)
            showSolution(challenge);

            await new Promise(r => setTimeout(r, 800)); // Wait for fly back

            // Cleanup
            document.body.removeChild(ghost);
            card.style.opacity = '1';
            card.classList.add('selected');
            isProcessing = false;
            aiStatus.textContent = "Waiting for input...";
        });
    });

    function showSolution(type) {
        const data = responses[type];
        if (!solutionOutput) return;

        solutionOutput.innerHTML = `
            <div class="solution-card">
                <div class="solution-header">
                    <span class="solution-icon">${data.icon}</span>
                    <h3 class="solution-title">${data.title}</h3>
                </div>
                <div class="solution-body">
                    <p class="solution-summary">${data.summary || ''}</p>
                    <button class="solution-toggle" type="button" aria-expanded="false">Read more</button>
                    <div class="solution-details" hidden>
                        ${data.content}
                    </div>
                </div>
                <div style="margin-top: 1.5rem; text-align: center;">
                    <a href="#services" class="adam-btn-secondary">See What ADAM Does</a>
                </div>
            </div>
        `;

        const toggle = solutionOutput.querySelector('.solution-toggle');
        const details = solutionOutput.querySelector('.solution-details');
        if (toggle && details) {
            toggle.addEventListener('click', () => {
                const expanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', String(!expanded));
                details.hidden = expanded;
                toggle.textContent = expanded ? 'Read more' : 'Show less';
            });
        }
    }

    // Progressive disclosure (collapsibles + service tiles)
    function setupCollapsibles() {
        document.querySelectorAll('[data-collapsible]').forEach(wrapper => {
            const toggle = wrapper.querySelector('.adam-collapsible-toggle');
            const content = wrapper.querySelector('.adam-collapsible-content');
            if (!toggle || !content) return;

            toggle.addEventListener('click', () => {
                const expanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', String(!expanded));
                content.hidden = expanded;
            });
        });
    }

    function setupServiceAccordion() {
        document.querySelectorAll('[data-accordion]').forEach(container => {
            container.querySelectorAll('[data-accordion-item]').forEach(item => {
                const head = item.querySelector('.adam-service-head');
                if (!head) return;

                const detailsId = head.getAttribute('aria-controls');
                const details = detailsId ? document.getElementById(detailsId) : null;
                if (!details) return;

                head.addEventListener('click', () => {
                    const isOpen = head.getAttribute('aria-expanded') === 'true';
                    head.setAttribute('aria-expanded', String(!isOpen));
                    details.hidden = isOpen;
                });
            });
        });
    }

    setupCollapsibles();
    setupServiceAccordion();

    // Growth Predictor Logic
    const predictorForm = document.getElementById('growth-predictor-form');
    const predictorResults = document.getElementById('predictor-results');

    if (predictorForm && predictorResults) {
        predictorForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const followersInput = document.getElementById('current-followers');
            const postsInput = document.getElementById('posts-per-week');
            if (!followersInput || !postsInput) return;

            const followers = parseInt(followersInput.value);
            const postsPerWeek = parseInt(postsInput.value);

            // Simple projection formula (demo purposes)
            const weeks = 12; // 90 days
            const baseGrowthRate = 0.02; // 2% per post without ADAM
            const adamGrowthRate = 0.12; // 12% per post with ADAM

            const currentPaceGrowth = Math.round(followers * baseGrowthRate * postsPerWeek * weeks);
            const adamPaceGrowth = Math.round(followers * adamGrowthRate * postsPerWeek * weeks);
            const difference = Math.round((adamPaceGrowth / currentPaceGrowth - 1) * 100);

            // Update results
            const curRes = document.getElementById('current-pace-result');
            const adamRes = document.getElementById('adam-pace-result');
            const diffRes = document.getElementById('difference-result');

            if (curRes) curRes.textContent = `+${currentPaceGrowth.toLocaleString()} followers`;
            if (adamRes) adamRes.textContent = `+${adamPaceGrowth.toLocaleString()} followers`;
            if (diffRes) diffRes.textContent = `+${difference}% faster`;

            // Show results
            predictorResults.style.display = 'block';
            predictorResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Store for potential use later
            try {
                sessionStorage.setItem('adamProjection', JSON.stringify({
                    currentFollowers: followers,
                    postsPerWeek,
                    projectedGrowth: adamPaceGrowth
                }));
            } catch (err) {
                console.error('Session storage error:', err);
            }
        });
    }

    // Waitlist Form Logic
    const waitlistForm = document.getElementById('waitlist-form');
    const waitlistSuccess = document.getElementById('waitlist-success');

    if (waitlistForm && waitlistSuccess) {
        waitlistForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailEl = document.getElementById('waitlist-email');
            const followersEl = document.getElementById('follower-range');
            const nicheEl = document.getElementById('niche');

            if (!emailEl || !followersEl || !nicheEl) return;

            const email = emailEl.value;
            const followers = followersEl.value;
            const niche = nicheEl.value;

            // Validation
            if (!email || !followers || !niche) {
                alert('Please fill in all fields.');
                return;
            }

            // Simulate submission
            console.log('Waitlist submission:', { email, followers, niche });

            // Show success message
            waitlistForm.style.display = 'none';
            waitlistSuccess.style.display = 'block';

            // Generate random waitlist position
            const position = Math.floor(Math.random() * 100) + 2800;
            const posEl = document.getElementById('position-number');
            if (posEl) posEl.textContent = position;

            waitlistSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // Share Functions
    window.shareToTwitter = function() {
        const text = "I just joined the ADAM waitlist - a TikTok AI growth manager that actually helps you grow. Check it out!";
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };

    window.copyReferralLink = function() {
        const link = window.location.href + '?ref=user123';
        navigator.clipboard.writeText(link).then(() => {
            alert('Referral link copied! Share it to skip 10 spots per signup.');
        });
    };

    // Event listeners for buttons previously using onclick
    document.getElementById('share-twitter-btn')?.addEventListener('click', window.shareToTwitter);
    document.getElementById('copy-referral-btn')?.addEventListener('click', window.copyReferralLink);
    document.getElementById('request-access-btn')?.addEventListener('click', () => {
        document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Interactive Demo Listeners
    document.getElementById('sync-demo-btn')?.addEventListener('click', () => {
        if (typeof window.startPipelineDemo === 'function') window.startPipelineDemo();
    });
    document.getElementById('scan-demo-btn')?.addEventListener('click', () => {
        if (typeof window.startNeuralScan === 'function') window.startNeuralScan();
    });
    document.getElementById('growth-demo-btn')?.addEventListener('click', () => {
        if (typeof window.animateGrowth === 'function') window.animateGrowth();
    });
    document.getElementById('play-graph-btn')?.addEventListener('click', () => {
        if (typeof window.playVelocityAnimation === 'function') window.playVelocityAnimation();
    });

    // Scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = btn.dataset.scenario;
            if (scenario && typeof window.showScenario === 'function') {
                window.showScenario(scenario);
            }
        });
    });

    // Animate stats on scroll
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = parseInt(stat.dataset.count);
                if (!isNaN(target)) {
                    animateCount(stat, target);
                }
                statsObserver.unobserve(stat);
            }
        });
    });

    document.querySelectorAll('.adam-stat-number[data-count]').forEach(stat => {
        statsObserver.observe(stat);
    });

    function animateCount(element, target) {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = formatNumber(Math.floor(current));
        }, 30);
    }

    function animateCountFrom(
        element,
        start,
        target,
        formatter = (n) => n.toLocaleString(),
        options = {}
    ) {
        if (element._countTimer) {
            clearInterval(element._countTimer);
            element._countTimer = null;
        }

        let current = start;
        const steps = Number.isFinite(options.steps) ? options.steps : 50;
        const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 30;
        const increment = (target - start) / steps;

        element._countTimer = setInterval(() => {
            current += increment;
            if ((increment >= 0 && current >= target) || (increment < 0 && current <= target)) {
                current = target;
                clearInterval(element._countTimer);
                element._countTimer = null;
            }
            element.textContent = formatter(Math.floor(current));
        }, intervalMs);
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    // Viral Lab V4: Followers counter (starts after "Video B" is selected, then full 3s pause)
    const V4_CYCLE_MS = 10000;
    // Sequence: checkmark completes (~60%) -> followers pulse (60-62%) -> counter starts after pulse
    const V4_COUNTER_START_MS = 6500;
    // 25 * 20ms = 500ms => finishes right before the 3s hold (starts at 7000ms)
    const V4_COUNTER_STEPS = 25;
    const V4_COUNTER_INTERVAL_MS = 20;

    const v4FollowersObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const el = entry.target;
            const container = el.closest('.visual-viral-lab-v4');
            if (!container) return;

            const start = parseInt(el.dataset.countStart || '0', 10);
            const target = parseInt(el.dataset.countTarget || '0', 10);
            if (!Number.isFinite(start) || !Number.isFinite(target)) return;

            if (!entry.isIntersecting) {
                if (el._v4CycleTimer) {
                    clearInterval(el._v4CycleTimer);
                    el._v4CycleTimer = null;
                }
                if (el._v4StartTimer) {
                    clearTimeout(el._v4StartTimer);
                    el._v4StartTimer = null;
                }
                delete el.dataset.v4LoopSetup;
                return;
            }

            if (el.dataset.v4LoopSetup === 'true') return;
            el.dataset.v4LoopSetup = 'true';

            const formatter = (n) => n.toLocaleString();

            const restartV4Animations = () => {
                // Forces all CSS animations inside the V4 visual to restart at 0%
                container.classList.add('v4-reset');
                void container.offsetWidth;
                container.classList.remove('v4-reset');
            };

            const runCycle = () => {
                if (el._v4StartTimer) {
                    clearTimeout(el._v4StartTimer);
                    el._v4StartTimer = null;
                }

                el.textContent = formatter(start);

                el._v4StartTimer = window.setTimeout(() => {
                    animateCountFrom(el, start, target, formatter, {
                        steps: V4_COUNTER_STEPS,
                        intervalMs: V4_COUNTER_INTERVAL_MS
                    });
                }, V4_COUNTER_START_MS);
            };

            restartV4Animations();
            runCycle();
            el._v4CycleTimer = window.setInterval(runCycle, V4_CYCLE_MS);
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.v4-followers-number[data-count-start][data-count-target]').forEach(el => {
        v4FollowersObserver.observe(el);
    });

    // =====================================================================
    // NAVIGATION
    // =====================================================================
    // This site uses the injected global nav from `js/global-nav.js`.
    // Do NOT add legacy menu toggles (`.mobile-menu-toggle`, `.nav-list`) here.

    // How It Works Tabs Logic
    const tabs = document.querySelectorAll('.adam-step-tab');
    const panels = document.querySelectorAll('.adam-step-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => {
                p.classList.remove('active');
                p.hidden = true;
            });

            // Activate clicked
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const panelId = tab.getAttribute('aria-controls');
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('active');
                panel.hidden = false;
            }
        });
    });

    // Scroll Reveal Animation Logic
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    });

    // Observe all reveal elements
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    // Parallax effect for hero particles
    const heroSection = document.querySelector('.adam-hero');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            heroSection.style.backgroundPositionY = rate + 'px';
        });
    }

    // Add floating particles to hero
    function createParticles() {
        const particlesContainer = document.querySelector('.hero-particles');
        if (!particlesContainer) return;

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: var(--color-secondary);
                border-radius: 50%;
                opacity: ${Math.random() * 0.5 + 0.2};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            particlesContainer.appendChild(particle);
        }
    }
    createParticles();

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // =========================================
    // INTERACTIVE VISUALIZATION SCRIPTS
    // =========================================

    // 1) Data Pipeline Demo
    let pipelineInterval;
    window.startPipelineDemo = function() {
        const videosEl = document.getElementById('videos-synced');
        const metricsEl = document.getElementById('metrics-captured');

        if (!videosEl || !metricsEl) return;

        let videos = 0;
        let metrics = 0;
        const targetVideos = 127;
        const targetMetrics = 4826;

        clearInterval(pipelineInterval);
        videos = 0;
        metrics = 0;

        pipelineInterval = setInterval(() => {
            if (videos < targetVideos) {
                videos += Math.ceil(Math.random() * 5);
                if (videos > targetVideos) videos = targetVideos;
                videosEl.textContent = videos;
            }
            if (metrics < targetMetrics) {
                metrics += Math.ceil(Math.random() * 200);
                if (metrics > targetMetrics) metrics = targetMetrics;
                metricsEl.textContent = metrics.toLocaleString();
            }
            if (videos >= targetVideos && metrics >= targetMetrics) {
                clearInterval(pipelineInterval);
            }
        }, 50);
    };

    // 2) Neural Network Canvas Visualization
    function initNeuralCanvas() {
        const canvas = document.getElementById('neural-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        const nodes = [];
        const connections = [];
        const nodeCount = 25;

        // Create nodes in layers
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: 30 + Math.random() * (rect.width - 60),
                y: 20 + Math.random() * (rect.height - 40),
                radius: 4 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                active: false
            });
        }

        // Create connections
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                if (dist < 100) {
                    connections.push({ from: i, to: j, dist });
                }
            }
        }

        function draw() {
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw connections
            connections.forEach(conn => {
                const from = nodes[conn.from];
                const to = nodes[conn.to];
                const opacity = Math.max(0.05, 0.2 - conn.dist / 500);

                ctx.beginPath();
                ctx.strokeStyle = from.active || to.active
                    ? `rgba(6, 182, 212, ${opacity * 3})`
                    : `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = from.active || to.active ? 1.5 : 0.5;
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            });

            // Draw nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = node.active
                    ? 'rgba(6, 182, 212, 1)'
                    : 'rgba(148, 163, 184, 0.5)';
                ctx.fill();

                if (node.active) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Update position
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 10 || node.x > rect.width - 10) node.vx *= -1;
                if (node.y < 10 || node.y > rect.height - 10) node.vy *= -1;
            });

            requestAnimationFrame(draw);
        }

        draw();
        return nodes;
    }

    let neuralNodes = [];
    setTimeout(() => { neuralNodes = initNeuralCanvas() || []; }, 500);

    window.startNeuralScan = function() {
        const visual = document.getElementById('neural-visual');
        const discoveries = document.querySelectorAll('.discovery-item');

        if (!visual) return;

        // Reset
        visual.classList.remove('scanning');
        discoveries.forEach(d => d.classList.remove('revealed'));

        // Start scan
        setTimeout(() => {
            visual.classList.add('scanning');

            // Activate nodes progressively
            if (neuralNodes.length > 0) {
                neuralNodes.forEach(n => n.active = false);
                let activateIndex = 0;
                const activateInterval = setInterval(() => {
                    if (activateIndex < neuralNodes.length) {
                        neuralNodes[activateIndex].active = true;
                        activateIndex++;
                    } else {
                        clearInterval(activateInterval);
                    }
                }, 80);
            }

            // Reveal discoveries
            discoveries.forEach((item, i) => {
                setTimeout(() => {
                    item.classList.add('revealed');
                }, 800 + (i * 600));
            });
        }, 100);
    };

    // 3) Growth Trajectory Animation
    window.animateGrowth = function() {
        const withPath = document.querySelector('.trajectory-path.with-adam');
        const withFill = document.querySelector('.trajectory-fill.with-adam');
        const dot = document.querySelector('.trajectory-dot');
        const milestones = document.querySelectorAll('.milestone');

        if (!withPath) return;

        // Reset
        withPath.classList.remove('animated');
        withFill.classList.remove('animated');
        dot.classList.remove('animated');
        milestones.forEach(m => m.classList.remove('revealed'));

        // Animate
        setTimeout(() => {
            withPath.classList.add('animated');
            withFill.classList.add('animated');
            dot.classList.add('animated');

            milestones.forEach((m, i) => {
                setTimeout(() => {
                    m.classList.add('revealed');
                }, 600 + (i * 600));
            });
        }, 100);
    };

    // 4) First-Hour Velocity Graph - Scenario Toggle & Animation
    let currentScenario = 'without';
    let isAnimating = false;

    window.showScenario = function(scenario) {
        if (isAnimating) return;
        currentScenario = scenario;

        // Update buttons
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scenario === scenario);
        });

        const withoutGroup = document.getElementById('without-adam-group');
        const withGroup = document.getElementById('with-adam-group');
        const marker = document.getElementById('intervention-marker');
        const withoutLegend = document.querySelector('.without-legend');
        const withLegend = document.querySelector('.with-legend');
        const withoutOutcome = document.getElementById('without-outcome');
        const withOutcome = document.getElementById('with-outcome');

        if (!withoutGroup || !withGroup || !marker || !withoutLegend || !withLegend || !withoutOutcome || !withOutcome) return;

        // Reset animation classes
        withoutGroup.classList.remove('animate');
        withGroup.classList.remove('animate');

        switch(scenario) {
            case 'without':
                withoutGroup.style.opacity = '1';
                withoutGroup.classList.add('visible');
                withGroup.style.opacity = '0';
                withGroup.classList.remove('visible');
                marker.style.opacity = '0';
                withoutLegend.style.opacity = '1';
                withLegend.style.opacity = '0.3';
                withoutOutcome.style.opacity = '1';
                withOutcome.style.opacity = '0.4';
                break;
            case 'with':
                withoutGroup.style.opacity = '0';
                withoutGroup.classList.remove('visible');
                withGroup.style.opacity = '1';
                withGroup.classList.add('visible');
                marker.style.opacity = '1';
                withoutLegend.style.opacity = '0.3';
                withLegend.style.opacity = '1';
                withoutOutcome.style.opacity = '0.4';
                withOutcome.style.opacity = '1';
                break;
            case 'compare':
                withoutGroup.style.opacity = '1';
                withoutGroup.classList.add('visible');
                withGroup.style.opacity = '1';
                withGroup.classList.add('visible');
                marker.style.opacity = '1';
                withoutLegend.style.opacity = '1';
                withLegend.style.opacity = '1';
                withoutOutcome.style.opacity = '1';
                withOutcome.style.opacity = '1';
                break;
        }
    };

    window.playVelocityAnimation = function() {
        if (isAnimating) return;
        isAnimating = true;

        const btn = document.getElementById('play-graph-btn');
        if (btn) {
            btn.innerHTML = '<span class="btn-icon">⏳</span> Playing...';
            btn.style.pointerEvents = 'none';
        }

        const withoutGroup = document.getElementById('without-adam-group');
        const withGroup = document.getElementById('with-adam-group');
        const marker = document.getElementById('intervention-marker');
        const withoutLegend = document.querySelector('.without-legend');
        const withLegend = document.querySelector('.with-legend');
        const withoutOutcome = document.getElementById('without-outcome');
        const withOutcome = document.getElementById('with-outcome');

        if (!withoutGroup || !withGroup || !marker || !withoutLegend || !withLegend || !withoutOutcome || !withOutcome) return;

        // Reset everything
        withoutGroup.style.opacity = '0';
        withoutGroup.classList.remove('visible', 'animate');
        withGroup.style.opacity = '0';
        withGroup.classList.remove('visible', 'animate');
        marker.style.opacity = '0';
        withoutLegend.style.opacity = '0.3';
        withLegend.style.opacity = '0.3';
        withoutOutcome.style.opacity = '0.4';
        withOutcome.style.opacity = '0.4';

        // Update buttons to show compare
        document.querySelectorAll('.scenario-btn').forEach(b => {
            b.classList.remove('active');
        });
        const compareBtn = document.querySelector('.scenario-btn[data-scenario="compare"]');
        if (compareBtn) compareBtn.classList.add('active');
        currentScenario = 'compare';

        // Phase 1: Animate "Without ADAM" curve
        setTimeout(() => {
            withoutGroup.style.opacity = '1';
            withoutGroup.classList.add('animate');
            withoutLegend.style.opacity = '1';
            withoutOutcome.style.opacity = '1';
        }, 300);

        // Phase 2: Show intervention marker
        setTimeout(() => {
            marker.style.opacity = '1';
        }, 2500);

        // Phase 3: Animate "With ADAM" curve
        setTimeout(() => {
            withGroup.style.opacity = '1';
            withGroup.classList.add('animate');
            withLegend.style.opacity = '1';
            withOutcome.style.opacity = '1';
        }, 3000);

        // Done
        setTimeout(() => {
            isAnimating = false;
            if (btn) {
                btn.innerHTML = '<span class="btn-icon">▶️</span> Watch Again';
                btn.style.pointerEvents = 'auto';
            }

            // Mark as visible for hover states
            withoutGroup.classList.add('visible');
            withGroup.classList.add('visible');
        }, 5500);
    };

    // Initialize with "Without ADAM" scenario
    document.addEventListener('DOMContentLoaded', () => {
        const withoutGroup = document.getElementById('without-adam-group');
        if (withoutGroup) {
            withoutGroup.classList.add('visible');
        }
    });

    // 5) 3D Card Tilt Effect
    document.querySelectorAll('.adam-feature-card, .adam-value-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });

    // 6) Hero Dashboard 3D Parallax
    const heroDashboard = document.getElementById('hero-dashboard');
    if (heroDashboard) {
        const container = heroDashboard.querySelector('.dashboard-3d-container');
        if (container) {
            heroDashboard.addEventListener('mousemove', (e) => {
                const rect = heroDashboard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * 10;
                const rotateY = ((centerX - x) / centerX) * 10;

                container.style.transform = `rotateX(${5 + rotateX}deg) rotateY(${-5 + rotateY}deg)`;
            });

            heroDashboard.addEventListener('mouseleave', () => {
                container.style.transform = '';
            });
        }
    }

    // 7) Animate dashboard metrics on scroll into view
    const dashboardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animate the mini chart line
                const chartPath = entry.target.querySelector('.mini-chart path');
                if (chartPath) {
                    chartPath.style.strokeDasharray = '300';
                    chartPath.style.strokeDashoffset = '300';
                    chartPath.style.animation = 'draw-path 2s ease-out forwards';
                }
                dashboardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    if (heroDashboard) {
        dashboardObserver.observe(heroDashboard);
    }

})();
