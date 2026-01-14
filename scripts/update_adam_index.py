import os

file_path = r"c:\projects\LenkoStudio\adam\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<div class="adam-service-grid" data-accordion>'
end_marker = '<!-- Section 2: Inductive Hook #1 - Challenge Selector -->'

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    exit(1)

next_section_idx = content.find(end_marker)
if next_section_idx == -1:
    print("End marker not found")
    exit(1)

# Find the closing div of the grid.
section_end_idx = content.rfind('</section>', 0, next_section_idx)
container_end_idx = content.rfind('</div>', 0, section_end_idx)
grid_end_idx = content.rfind('</div>', 0, container_end_idx)

if not (start_idx < grid_end_idx < container_end_idx < section_end_idx):
    print(f"Error locating structure. Start: {start_idx}, GridEnd: {grid_end_idx}, ContainerEnd: {container_end_idx}")
    exit(1)

new_content = """<div class="adam-service-grid" data-accordion>
                        <!-- NEW CARDS ADDED -->
                        <article class="adam-service-card reveal-left stagger-1" data-accordion-item>
                            <button class="adam-service-head" type="button" aria-expanded="false" aria-controls="service-connect">
                                <div class="adam-service-top">
                                    <div class="adam-service-titles">
                                        <h3 class="adam-service-title">Decode Your Viral DNA</h3>                                        
                                        <p class="adam-service-blurb">Instantly analyze your entire content history to uncover the hidden patterns, specific hooks, and "Star Power" variables that drive *your* massive views.</p>
                                    </div>
                                </div>
                                <div class="adam-service-visual visual-connect" aria-hidden="true">
                                    <div class="connect-left-group">
                                        <div class="sparks thumb-sparks"></div>
                                        <div class="tiktok-ring"></div>
                                        <span class="tiktok-logo-large">
                                            <div class="tiktok-scan-fx"></div>
                                            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                                        </span>
                                    </div>
                                    <div class="connect-line-container">
                                        <div class="connect-dot left"></div>
                                        <div class="connect-line-path"></div>
                                        <div class="connect-line-active"></div>
                                        <div class="connect-scan-beam"></div>
                                        <div class="connect-dot right"></div>
                                    </div>
                                    <div class="connect-right-group">
                                        <div class="sparks adam-sparks"></div>
                                        <div class="ai-brain-icon">
                                            <!-- Processor/Chip Icon -->
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="4" y="4" width="16" height="16" rx="2" />
                                                <rect x="9" y="9" width="6" height="6" />
                                                <line x1="9" y1="1" x2="9" y2="4" />
                                                <line x1="15" y1="1" x2="15" y2="4" />
                                                <line x1="9" y1="20" x2="9" y2="23" />
                                                <line x1="15" y1="20" x2="15" y2="23" />
                                                <line x1="20" y1="9" x2="23" y2="9" />
                                                <line x1="20" y1="14" x2="23" y2="14" />
                                                <line x1="1" y1="9" x2="4" y2="9" />
                                                <line x1="1" y1="14" x2="4" y2="14" />
                                            </svg>
                                        </div>
                                        <span class="adam-text-neon">ADAM</span>
                                    </div>
                                </div>
                                <div class="adam-service-cta" aria-hidden="true">More</div>
                            </button>
                            <div class="adam-service-details" id="service-connect" hidden>
                                <ul class="adam-check-list">
                                    <li><b>Instant Profile Audit:</b> See exactly why your hits went viral and why your flops failed.</li>
                                    <li><b>Audience X-Ray:</b> Understand your viewers better than they understand themselves.</li>
                                    <li><b>Secure Intelligence:</b> 100% safe, read-only analysis via official TikTok API.</li>
                                </ul>
                            </div>
                        </article>

                        <article class="adam-service-card reveal-scale stagger-2" data-accordion-item>
                            <button class="adam-service-head" type="button" aria-expanded="false" aria-controls="service-earn">
                                <div class="adam-service-top">
                                    <div class="adam-service-titles">
                                        <h3 class="adam-service-title">Hack Consistency With Gamification</h3>
                                        <p class="adam-service-blurb">Re-wire your brain for success. We transform overwhelming growth goals into addictive, bite-sized <b>daily missions</b> that build unstoppable momentum.</p>
                                    </div>
                                </div>
                                <div class="adam-service-visual visual-coin-earn" aria-hidden="true">
                                    <div class="earn-paper">
                                        <div class="earn-row row-1"><div class="earn-check"></div><div class="earn-line"></div></div>
                                        <div class="earn-row row-2"><div class="earn-check"></div><div class="earn-line"></div></div>
                                        <div class="earn-row row-3"><div class="earn-check"></div><div class="earn-line"></div></div>
                                    </div>
                                    
                                    <div class="earn-wallet">
                                        <span class="earn-wallet-icon">🪙</span>
                                        <div class="earn-counter-wrapper">
                                            <div class="earn-counter-scroll">
                                                <span>0</span>
                                                <span>50</span>
                                                <span>100</span>
                                                <span>150</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="earn-falling-coins">
                                        <div class="coin-batch batch-1"><i>🪙</i><i>🪙</i><i>🪙</i></div>
                                        <div class="coin-batch batch-2"><i>🪙</i><i>🪙</i><i>🪙</i></div>
                                        <div class="coin-batch batch-3"><i>🪙</i><i>🪙</i><i>🪙</i></div>
                                    </div>
                                </div>
                                <div class="adam-service-cta" aria-hidden="true">More</div>
                            </button>
                            <div class="adam-service-details" id="service-earn" hidden>
                                <ul class="adam-check-list">
                                    <li><b>Dopamine-Fueled Streaks:</b> Turn daily grinding into a game you actually want to play.</li>
                                    <li><b>Burnout-Proof Planning:</b> Smart schedules that adapt to your energy levels.</li>
                                    <li><b>High-ROI Activities:</b> Focus only on the 20% of actions that bring 80% of results.</li>
                                </ul>
                            </div>
                        </article>

                        <article class="adam-service-card reveal-right stagger-3" data-accordion-item>
                            <button class="adam-service-head" type="button" aria-expanded="false" aria-controls="service-golden-hour">
                                <div class="adam-service-top">
                                    <span class="adam-service-icon" aria-hidden="true">⚡</span>
                                    <div class="adam-service-titles">
                                        <h3 class="adam-service-title">Dominate The First "Golden Hour"</h3>
                                        <p class="adam-service-blurb">The algorithm decides your fate in the first 60 minutes. Get real-time emergency alerts and "rescue plans" to <b>save underperforming videos</b> before they flatline.</p>
                                    </div>
                                </div>
                                <div class="adam-service-visual visual-spark" aria-hidden="true">
                                    <div class="spark-line"></div>
                                    <div class="spark-dot"></div>
                                    <div class="spark-ping"></div>
                                </div>
                                <div class="adam-service-cta" aria-hidden="true">More</div>
                            </button>
                            <div class="adam-service-details" id="service-golden-hour" hidden>
                                <ul class="adam-check-list">
                                    <li><b>Live Pulse Checks:</b> Know instantly if a video is tanking or trending.</li>
                                    <li><b>Crisis Intervention:</b> Specific, actionable comments and engagement hacks to revive reach.</li>
                                    <li><b>A/B Science:</b> Stop guessing. Run experiments to prove exactly what works.</li>
                                </ul>
                            </div>
                        </article>"""

# Replace content
updated_content = content[:start_idx] + new_content + content[grid_end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("Update successful")
