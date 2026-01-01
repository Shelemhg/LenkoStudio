# Annotated Wireframe — Creator Growth Decision Simulator (Single Page)
*Audience: An LLM that will generate the actual page (UI + interactions).*

## 0) What you are building
A **single, story-driven simulator page** for early-stage creators (18–35).  
User reads short “chapters,” makes **binary choices** (DIY vs Pro or strategic trade-offs), and sees a **persistent dashboard** update (metrics + animated graphs).  
Tone: **emotionally grounded, semi-serious**, slight playfulness.

### Non-negotiables
- Dashboard is **sticky/pinned** (top of viewport) while user scrolls.
- Dashboard has **two primary panes**:
  1) **Graph pane** (left on desktop)  
  2) **Data pane** (right on desktop)  
  On narrow screens, panes **stack vertically** (graph first, then data).
- Experience includes **4–6 decision points**.
- The simulator must feel **truthful and credible**: avoid “overnight viral” claims. Some DIY choices should be valid.
- End with a **summary + reminder**: “This was a simulator; real time moves forward; choices are sticky in real life.”

---

## 1) Information Architecture (Single Page)
1. **Sticky Dashboard (always visible)**
2. **Hero / Setup (short, engaging, 10–20 seconds reading)**
3. **Decision Chapters (4–6)**
4. **Deep-Dive Explain Panels (after selected chapters)**
5. **Final Summary + CTA**
6. **Footer (links, legal, AI Manager teaser link-out)**

---

## 2) Page Layout — Annotated ASCII Wireframe

### 2.1 Sticky Dashboard (Top, anchored)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Brand Logo]  Creator Growth Simulator   [Reset] [Undo] [Replay Path] [CTA] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────── Graph Pane ────────────────────────────────┐  │
│ │  Line Chart: Followers over time (animated transitions per decision)    │  │
│ │  Secondary toggle: Views / Engagement / Income                          │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────── Data Pane ─────────────────────────────────┐  │
│ │  Followers: 1,200  (+40)         Avg Views/Post: 1,800 (+120)           │  │
│ │  Engagement: 9.8% (+0.4)        Monthly Income: $0 (+$0)               │  │
│ │  Brand Deal Interest: 12/100 (+3)  Subscriber Fans: 0 (+0)             │  │
│ │  Net Cashflow (this month): $0  (Income - Costs)                        │  │
│ │  Active Costs (rows added dynamically):                                 │  │
│ │    - “Subscriber content shoot”  -$120/mo   (row appears when chosen)   │  │
│ │    - “Studio session”            -$200 one-time                          │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Notes / behaviors**
- **Reset**: clears choices to baseline.
- **Undo**: one step back.
- **Replay Path**: animates the dashboard along the chosen history (fast timeline).
- **CTA**: “Plan a shoot” (primary). Secondary: “Explore AI Manager” (link-out).

**Responsive**
- Desktop: graph pane + data pane in 2 columns.
- Mobile: stack graph pane above data pane. Keep sticky but reduce height; chart becomes sparkline.

---

### 2.2 Hero / Setup (Below dashboard)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Headline: “Your next 6 decisions shape the next 6 months.”                 │
│ Subhead: short, grounded, emotionally resonant copy (2–3 lines).           │
│ [Start Simulation]  (scrolls to Chapter 1)                                  │
│ Small note: “Simulator – estimates. Real growth varies.”                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Copy style guidance**
- Short sentences. No hype. Feels like a coach.
- Example: “You’re posting 3–4 times a week. You’re improving, but the growth curve is flattening. Today you’ll choose how you spend time, money, and attention.”

---

## 3) Simulation Model (State + Metrics)

### 3.1 Core state (what you store)
- `choices[]`: array of `{chapterId, optionId, timestamp}`
- `metrics`: current metrics object (derived from baseline + deltas + compounding rules)
- `costRows[]`: list of active cost items shown in dashboard data pane
- `timeline[]`: points for chart rendering (followers over “weeks”)
- `insightsUnlocked[]`: which explainers have been shown

### 3.2 Metrics to display (dashboard)
Minimum:
- `followers` (integer)
- `avgViewsPerPost` (integer)
- `engagementRate` (percentage, 0–100)
- `monthlyIncome` (currency)
Recommended extra:
- `brandDealInterestScore` (0–100)
- `subscriberFans` (integer)
- `netCashflowThisMonth` (monthlyIncome - recurringCosts - amortizedOneTimeCosts)
Optional (only if you have room):
- `postingCadencePerWeek` (2–12)
- `retentionScore` (0–100, proxy)

### 3.3 Baseline values (start of simulation)
(Adjustable; keep plausible)
- Followers: **1,200**
- Avg Views/Post: **1,800**
- Engagement Rate: **9.8%**
- Monthly Income: **$0**
- Brand Deal Interest: **12/100**
- Subscriber Fans: **0**
- Net Cashflow: **$0**

### 3.4 Delta rules (credibility)
- Avoid giant jumps. Prefer **small deltas + compounding**:
  - Visual improvements: modest immediate lift; larger lift if paired with consistency.
  - Monetization: income increases may trade off with engagement/brand trust.
  - Pro services: sometimes best at **milestones** or when moving into **premium content**, not always.

### 3.5 Compounding / synergy (simple)
Implement 2–3 synergy rules so the simulation feels “smart”:
- If user chooses **Consistent Posting + Strong Visual Branding**, then weekly follower growth multiplier `x1.15`.
- If user chooses **Early monetization before trust**, engagement multiplier `x0.95` for 1–2 chapters.
- If user chooses **Premium subscriber content**, brandDealInterest might go up (professionalism), but net cashflow can dip due to costs until subscriber count grows further.

---

## 4) Decision Chapters (4–6) — Concrete Script + Deltas
Each chapter has:
- `title`
- `storyText` (2–6 short lines)
- `optionA` (DIY / cheaper / time-heavy)
- `optionB` (Pro / paid / time-saver)
- `deltasA`, `deltasB`
- `explainers`: which insight cards/graphs to show after choosing

### Chapter 1 — “First Impression Reset”
**Story (short):**  
“You check your profile at night. The content is getting better… but the profile still looks like a draft.  
You have 15 seconds to convince a stranger to follow.”

- **A) DIY refresh (phone, templates, one weekend):**
  - Followers: +20
  - Avg Views/Post: +50
  - Engagement: +0.2%
  - Brand Deal Interest: +1
  - Cost: $0
- **B) Pro mini-session (profile + thumbnails + 10 hero photos):**
  - Followers: +40
  - Avg Views/Post: +120
  - Engagement: +0.4%
  - Brand Deal Interest: +3
  - Cost row: “Branding mini-session” **-$180 one-time** (shown in cost rows)
**Explainers (after choice):**
- “First impressions” insight card
- Mini bar chart: “Profile conversion uplift (small but compounding)”

---

### Chapter 2 — “Consistency vs Burnout”
“You can post more, but the quality drops when you rush.  
Your audience wants consistency *and* a reason to care.”

- **A) Post 5x/week, quick edits:**
  - Avg Views/Post: -80 (quality hit)
  - Followers: +60 (more surface area)
  - Engagement: -0.3%
  - Brand Deal Interest: +1
  - Cost: $0
- **B) Post 3x/week, higher craft + repeatable workflow:**
  - Avg Views/Post: +120
  - Followers: +45
  - Engagement: +0.5%
  - Brand Deal Interest: +2
  - Cost: $0
**Explainers:**
- Chart toggle to “Views per post”
- Insight card: “Consistency is a lever; workflow beats motivation.”

---

### Chapter 3 — “Milestone Celebration (the moment pro makes sense)”
“You’re about to hit a visible milestone (2k/5k/10k).  
A celebration post can reset momentum.”

- **A) Simple milestone post (DIY):**
  - Followers: +35
  - Avg Views/Post: +70
  - Engagement: +0.2%
  - Brand Deal Interest: +1
  - Cost: $0
- **B) Pro celebration shoot + one cinematic reel:**
  - Followers: +70
  - Avg Views/Post: +220
  - Engagement: +0.6%
  - Brand Deal Interest: +4
  - Cost row: “Milestone shoot + reel” **-$250 one-time**
**Explainers:**
- Add an “Event spike” marker on the follower chart
- Insight card: “Why milestones convert: social proof + narrative.”

---

### Chapter 4 — “Start Monetizing (carefully)”
“A brand offers a small deal. It’s not huge money, but it’s your first signal.  
What you do now shapes trust.”

- **A) Accept the deal immediately:**
  - Monthly Income: +$120
  - Engagement: -0.5% (short-term)
  - Followers: +30
  - Brand Deal Interest: +3
  - Cost: $0
- **B) Delay monetization; build a ‘brand-safe’ kit first (press kit + brand style):**
  - Monthly Income: +$0
  - Engagement: +0.3%
  - Followers: +45
  - Brand Deal Interest: +2 now, +5 later (apply in Chapter 5 via synergy)
  - Cost row (optional if pro kit): “Brand kit design” **-$120 one-time**
**Explainers:**
- A small “Trust vs Money” scatter plot (visual metaphor)
- Insight card: “Monetization timing is strategy, not luck.”

---

### Chapter 5 — “Premium Subscribers (recurring decision)”
“Fans ask for behind-the-scenes and ‘more personal’ content.  
You can create a subscriber tier — but it takes work (and sometimes budget).”

- **A) DIY subscriber content (phone + weekly session):**
  - Subscriber Fans: +8/mo
  - Monthly Income: +$40/mo
  - Engagement: +0.1%
  - Followers: +25
  - Net Cashflow: +$40 (no costs)
- **B) Pro monthly subscriber pack (studio + edited set):**
  - Subscriber Fans: +20/mo
  - Monthly Income: +$100/mo
  - Followers: +35
  - Engagement: +0.2%
  - Cost row: “Subscriber content pack” **-$120/mo**
  - Net Cashflow: **-$20/mo** (until subscribers grow further)
**Explainers:**
- **Dynamic cost row appears** immediately after choosing option B.
- Add a stacked chart: “Subscriber income vs subscriber production cost”
- Insight card: “Recurring content = compounding, but only if sustainable.”

---

### Chapter 6 — “Scale or Solidify”
“You feel momentum. Now you choose: chase volume or consolidate a signature style.”

- **A) Chase trends hard (volume):**
  - Followers: +80 (short-term)
  - Avg Views/Post: +100
  - Engagement: -0.2%
  - Brand Deal Interest: +1
  - Risk note: volatility marker
- **B) Solidify signature series (repeatable format):**
  - Followers: +65
  - Avg Views/Post: +160
  - Engagement: +0.4%
  - Brand Deal Interest: +3
  - Adds “Series” badge (UI)
**Explainers:**
- Volatility band on graph for option A
- Insight card: “Repeatable formats = leverage.”

---

## 5) Chapter UI Pattern (Reusable Component)
```
┌──────────────────────── Chapter Card ────────────────────────┐
│ Chapter title                                                 │
│ 2–6 lines of story text (short, punchy)                       │
│                                                              │
│ [Option A Card]                       [Option B Card]         │
│ - label + 1-line summary              - label + 1-line summary│
│ - shows “cost” and “time” badges      - shows “cost” and “time”│
│                                                              │
│ After selection:                                               │
│  - outcome blurb (2–4 lines)                                   │
│  - “Why this changed the dashboard” tooltip/mini bullets       │
│  - “Show the data” expandable panel (optional)                 │
└──────────────────────────────────────────────────────────────┘
```

**Option cards — design notes**
- Include **badges**: `Cost`, `Time`, `Risk`, `Sustainability`
- After selection, visually lock the chosen option and display delta chips:
  - `+70 followers`, `- $120/mo`, etc.

---

## 6) “Other graphs on the page” (Explainers + Evidence)
After certain chapters, show a **Graph + Explanation** section that:
- Visually reinforces the “why”
- Doesn’t overload the user
- Uses short copy and a single chart

Examples:
1. **Profile Conversion Uplift** (after Chapter 1)  
   - Bar chart: “Visits → Follows” baseline vs improved profile  
   - Copy: 2–3 lines on first impression and consistency
2. **Trust vs Monetization Timing** (after Chapter 4)  
   - Scatter: “Audience trust” vs “income now” (metaphor)
3. **Subscription Unit Economics** (after Chapter 5)  
   - Stacked bars: Income vs cost; show breakeven point (e.g., at 24 subs)

---

## 7) Animation & Interaction Spec (Minimum)
- Dashboard numbers animate with **count-up** (300–600ms).
- Line chart animates to new curve (ease-in-out).
- Cost rows slide in from below when added.
- Chapter completion triggers a subtle “progress” animation.
- “Replay Path” scrubs through timeline points rapidly (2–4 seconds total).

Performance constraints:
- Avoid heavy WebGL. Keep it **CSS + lightweight chart library**.
- Prefer requestAnimationFrame / CSS transforms.

---

## 8) Content & Messaging (Credibility)
- Use explicit labels:
  - “Simulation”
  - “Estimates”
  - “Your mileage may vary”
- Never promise outcomes. Focus on **trade-offs**, timing, and sustainability.
- Make the “pro” choice win in **specific contexts**:
  - milestone moments
  - premium subscriber content
  - brand kit/press kit readiness
- Make DIY reasonable where it is:
  - early experimentation
  - authentic behind-the-scenes
  - cost constraints

---

## 9) End Screen (Summary + CTA)
```
┌──────────────────────────── Summary ────────────────────────────┐
│ “Your 6-month path”                                               │
│ - Final metrics snapshot                                           │
│ - Timeline highlight: biggest inflection points                    │
│ - 3 takeaways (short)                                              │
│                                                                   │
│ Reminder: “This was a simulator. Real time doesn’t reset.          │
│ Choices compound, and consistency writes history.”                 │
│                                                                   │
│ [Book a shoot]   [Download a checklist]   [Explore AI Manager]     │
└───────────────────────────────────────────────────────────────────┘
```

**Checklist idea (optional lead magnet)**
- “Creator Visual Reset Checklist (1 page)”
- Generated on-page or links to separate download

---

## 10) Implementation Guidance (for the LLM generating the page)
- Output should be a **single-page component** with:
  - sticky dashboard
  - chapter components
  - state management for choices and metric updates
- Use:
  - **React** recommended (or vanilla JS if requested)
  - a chart library (e.g., Recharts) for line + bars
  - **Framer Motion** for smooth UI transitions
- Accessibility:
  - keyboard selectable option cards
  - ARIA labels for chart toggles
  - respects `prefers-reduced-motion`

---

## 11) Acceptance Criteria (definition of done)
- Dashboard stays visible and updates after each choice.
- On mobile, dashboard panes stack correctly.
- 4–6 decision chapters exist with two options each.
- At least 3 explainer graph sections exist.
- A cost row can be added dynamically (subscription pack) and affects net cashflow.
- User can Undo and Reset. Replay Path animates.
- End summary renders a coherent narrative and metrics recap.

---

## 12) Assets Placeholder List (LLM should stub)
- 6 minimal icons (camera, phone, calendar, dollar, graph, badge)
- 1 logo placeholder
- background texture (subtle grid)
- optional “milestone confetti” micro-animation (lightweight)
