# Adam Landing + Site Recommendations (Services & Positioning)

**Last Updated:** 2026-01-05

This document focuses on improving the Adam marketing site (`/adam`) so it presents the product “services” (what users actually get) clearly, credibly, and consistently with the Phase 1/2 FRDs.

Additional constraint (from user feedback): visitors perceive a **wall of text** and leave. The homepage must act as a **hook**: communicate the core value in one short paragraph, then rely on **simple visuals/animations** and **progressive disclosure** (“Read more”) for details.

---

## 0) Truth Anchor (Non‑Negotiables)

From the docs (`adam_FRD_phase1.md`, `adam_FRD_phase2.md`, `adam_project_summary_for_llm_download.md`):

- Adam is an **analytics → action** system (not a dashboard).
- **Official TikTok API only** in Phase 1. No scraping. Don’t claim unavailable data.
- **Trust-first** UX: uncertainty labels, ranges, and “we don’t know” when we don’t know.
- Core primitives:
  - **Insight Cards** (what happened → why it matters → confidence → next step)
  - **Missions** (weekly plan + daily actions)
  - **Experiments** (structured tests with defined windows)

Any homepage/pitch that violates these (especially “fake precision” or “guaranteed outcomes”) will reduce trust and conversions.

---

## 1) Homepage: Hook-First Strategy (High Impact)

Target file: `adam/index.html`

### 1.1 Above-the-fold must answer “what is this?” in one paragraph

Goal: the visitor should understand the service without scrolling and without reading a wall of copy.

Replace the hero’s dense subheadline with:

- A short headline (7–10 words)
- One paragraph (2–3 sentences) that captures your intent:
  - Example direction (do not copy verbatim):
    - “Adam gives you tailored growth management advice by analyzing your TikTok profile stats and translating research-grade marketing strategy into clear weekly actions. You’ll know what to do next, why it matters, and how confident the recommendation is.”

Then add one small trust line (not a paragraph):

- “Read-only TikTok API connection. No scraping. Honest confidence labels.”

Why: this directly addresses the reported confusion (“did not understand what the page was about”).

### 1.2 Reduce text density: default to visuals + microcopy

For each major homepage block, cap visible text to:

- 1 title
- 1 sentence (max)
- 3 short bullets (optional)

Everything else must be hidden behind a small “Read more” / “See example” interaction.

This keeps the homepage skimmable and makes curiosity drive deeper reading.

### 1.3 Present the “services” as 3 clickable tiles (with animations)

Turn the core modules into three tiles that behave like interactive affordances. Each tile should include a micro-animation that explains the concept without text.

1) **First‑Hour Rescue**
- Visible: “Get alerted when a post is under baseline.”
- Animation: velocity curve draws → alert marker appears → checklist highlights.

2) **Experiments Engine**
- Visible: “Run simple tests. Keep what wins.”
- Animation: variant A/B cards → measurement windows → learning saved.

3) **Missions / Weekly Plan**
- Visible: “A weekly plan you can actually execute.”
- Animation: weekly goal → daily queue → streak progress.

Progressive disclosure on click: a small inline panel expands (not a new page) with the deliverable details.

### 1.4 Add a “Time to first value: 5 minutes” strip (one line + icons)

Keep this extremely compact:

- “Connect → Sync → Get: 1 insight • 1 mission • 1 experiment”

If you want more explanation, hide it behind “How it works” (expands inline).

### 1.5 Keep interactive demos, but make them optional (collapsed by default)

The existing demos are good, but they create length and reading fatigue.

Recommendation:

- Keep only one “hero demo” visible.
- Collapse the rest behind:
  - “Watch the 60s tour” (if real)
  - “Try the demo” (expand inline)

This keeps the page short and reduces bounce.

### 1.6 Fix trust-breaking “claims” (the biggest credibility leak)

Homepage currently includes numbers and outcomes that read as either placeholders or too absolute:

- “2,847+ creators / 43M+ views / 127% avg growth rate”
- “Real results from real creators” testimonials that look fictional
- “Creators who act within 15 minutes … see 3–5x higher final reach”
- Growth predictor that shows huge uplifts with no confidence bands

Recommendation:

- If these are real and verifiable, label them as “Beta metrics” and link to methodology.
- If not verifiable, replace with:
  - “Official TikTok API data (read-only)”
  - “Honest uncertainty labels”
  - “No scraping”
- Testimonials: either use real quotes (with permission) or label as “Example playthroughs” and make them clearly fictional.

### 1.7 Progressive disclosure pattern (global rule)

When a page is acting as a hook, details must be opt-in.

Use these patterns consistently:

- “Read more” expands a small panel below the element
- “See example” swaps the visual state (without adding more text)
- “Learn how we calculate this” links to Methodology

Avoid:

- multi-paragraph blocks
- long FAQ sections on the homepage
- big comparison tables on the homepage

The interactive sections are a strength — they teach. Keep them, but make sure they don’t claim Phase 2 capabilities as Phase 1.

- “Neural scan” copy should avoid implying unavailable metrics (e.g., completion/retention) unless Phase 1 truly has them.
- “Growth predictor” should show a range + confidence note and avoid “With Adam = guaranteed multiplier.”
- “First-hour velocity” demo should be presented as illustrative unless backed by real outcomes.

### 1.8 Fix the “Demo video coming soon” placeholder

If you don’t have a demo video, don’t use an `alert()` placeholder.
Replace with a static “Product Tour” panel that reuses your existing visuals (Connect/Analyze/Grow) and is fully functional.

### 1.9 Remove or implement broken footer links

Homepage links to pages that don’t exist in this repo:

- `adam-demo.html`
- `adam-case-studies.html`
- `adam-security.html`

Broken links are immediate conversion killers. Either create these pages or remove the links until they exist.

---

## 2) Site-Wide Consistency Fixes (Features, Pricing, Nav)

### 2.1 Choose one monetization story (subscription OR coins) — don’t mix

The public site currently uses subscription tiers (Free/Creator/Pro), while `monetization_pricing_model.md` proposes a coin/commitment economy.

Pick one for the public-facing site right now:

Option A (simplest): **Subscription tiers**
- Keep Free/Creator/Pro consistent across homepage + pricing + copy
- If coins are a future idea, move them to “Roadmap” language, not pricing UX

Option B (differentiated): **Coins + challenges**
- Pricing page must explain:
  - earning coins
  - spending coins
  - challenge settlement (A/B/C/D cases)
  - fairness logic and abuse prevention

Mixing both is confusing and undermines trust.

### 2.2 Features page: tag each feature as “Phase 1 (beta)” vs “Phase 2 (roadmap)”

Target file: `adam/adam-features.html`

Some sections imply advanced capabilities (statistical significance, calibrated prediction accuracy, content understanding).
Add small badges per section:

- Phase 1 (beta)
- Phase 2 (roadmap)

And tighten copy to avoid claiming unavailable metrics.

### 2.3 Navigation: fix “Back to Lenko Studio” for the subdomain

Target file: `adam/js/global-nav.js`

The “Back to Lenko Studio” link uses `href="/"`, which behaves differently on:

- `lenkostudio.com/adam` (works)
- `adam.lenkostudio.com` (goes to Adam root, not Lenko)

Change to an absolute link: `https://lenkostudio.com/`.

### 2.4 Simulator: turn it into a service bridge

Target file: `adam/adam-simulator.html`

The simulator is a strong lead magnet. Add conversion mapping:

- End-of-simulation CTA: “Turn this into a weekly plan + experiments” → waitlist
- Show a mini “How Adam translates this into actions” panel:
  - Mission example
  - Experiment example
  - First-hour alert example

---

## 3) New Pages You Should Add (Details live here, not on the hook page)

These solve current gaps and/or fix broken links.

### 3.1 Methodology / How Adam Works (Trust page)

Explain, in plain language:

- baselines (rolling medians/percentiles)
- anomaly triggers
- measurement windows
- confidence labels and “inconclusive” outcomes

This is the “trust engine” and supports the FRD principle of honesty.

### 3.2 Data Limits: What TikTok API can/can’t provide

A simple table:

- What we can see (account rollups, video counts, views/likes/comments/shares, etc.)
- What we cannot see reliably (revenue, detailed audience demographics, etc.)
- What is user-entered (income, ROI ledger)

This prevents churn from mismatched expectations.

### 3.3 Security page

If you say “security,” define it:

- read-only permissions
- token storage approach (high-level)
- what data you store vs don’t store

Avoid phrases like “bank-level” unless you can map to specific controls.

### 3.4 Case studies / Example playthroughs

If no real case studies exist yet, publish clearly labeled examples:

- “Example account A: what we detected → what we recommended → expected range”
- Include uncertainty labels.

### 3.5 Playbooks (service deliverables)

Create content pages that match the services:

- First-hour rescue playbook
- Experiment library (hypotheses)
- Weekly planning template

These make Adam feel like a system, not a set of features.

---

## 4) New Interactive Sections (Aligned with existing UX)

These are not “nice-to-haves”; they help visitors understand the services quickly.

### 4.1 Mission Generator Preview

Inputs:

- niche
- posting frequency
- biggest constraint (time/ideas/energy)

Output:

- 7-day mission queue (example)
- what success looks like

### 4.2 Experiment Builder Preview

Click-to-choose:

- Hook test
- Timing test
- Format test

Output:

- 2 variants
- measurement windows
- learning record

### 4.3 Insight Card demo (trust-first)

Show 2–3 cards with the actual schema:

- what happened
- why it matters
- confidence
- next step
- time sensitivity

This maps directly to the FRD.

### 4.4 Confidence explainer widget

Interactive control that shows how prediction bands widen/narrow when:

- sample size is small
- account is new
- signals conflict

This “teaches honesty” and differentiates from hypey tools.

---

## 5) Priority Order (Fastest path to more conversions + trust)

1) Replace hero copy with a single, clear paragraph + one trust line.
2) Convert “services” into 3 animated tiles with progressive disclosure.
3) Remove/replace trust-breaking claims (fake precision, placeholder stats, fictional-looking testimonials).
4) Collapse optional demos and long sections behind “Read more / Try demo”.
5) Remove/implement broken footer pages.
6) Align pricing story across homepage + pricing + docs (subscription vs coins).
7) Add “Phase 1 vs Phase 2” badges + tighten claims on features page.
8) Add Methodology + Data Limits pages, link them prominently.

---

## 6) Notes on “Services” Framing

If the goal is “present the services properly,” the homepage should answer, instantly:

- What do I get this week?
- What do I do today?
- How does this help in the first hour?
- What’s real vs estimated?

When the site does that, the interactive visuals become accelerators, not the only explanation.
