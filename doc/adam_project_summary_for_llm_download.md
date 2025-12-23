# Adam — TikTok AI Growth Manager (Project Summary for an LLM)

**Date context:** December 19, 2025 (America/Mexico_City)  
**Goal:** Build a desktop-first, professional-grade web app that feels *visually addictive* (in a good way) and helps TikTok creators grow faster via reliable analytics, missions, experiments, and an AI coach.

**Deployment Status:** Phase 1 landing page deployed. Backend ingestion service operational on Render. Frontend app (Next.js) not yet created.

---

## 1) Who this is for
- **Primary users:** TikTok content creators (mostly face-forward) aged **20–35**
- **Creator size:** **~400 to 10k followers** (early growth stage)
- **Typical niches:** dancing, singing, talking to followers (influencer style)
- **Current cadence:** ~2–5 posts/week; platform should guide toward **10–12 posts/week** (user-chosen goals)
- **Monetization profile:** **Live gifts** (main), **Patreon photo tiers**, some **subscriptions**

---

## 2) Product promise (what Adam is)
A “TikTok AI manager” that:
- Tracks performance with **reliable** data
- Converts analytics into **actionable, research-backed guidance**
- Uses **missions + gamified loops** to build habits and consistency
- Supports **A/B-style experiments** that create individualized learnings over time
- Offers **accurate growth prediction** (only if accuracy can be justified and calibrated)
- Feels superior to generic dashboards by being **decision-focused**, not metric-dumped

---

## 3) Data sources and constraints (ToS-first)
- **Primary data path:** Official **TikTok API** (reliable, professional)
- Optional future add-ons:
  - Instagram/X APIs for trends/news monitoring
  - Third-party services for deeper comment analysis (if purchased/licensed)
- Avoid reliance on scraping unless explicitly allowed and risk-managed.
- **Refresh cadence:** every **30 minutes** for videos posted within **<72h**, then reduced cadence as posts age.

---

## 4) What the current repository already does (your current baseline)
You already have a working foundation that collects and stores TikTok metrics and snapshots.

### Currently tracked (as described by you)
- **Account rollups:** followers, views, likes, comments, shares, video_count, engagement_rate, likes_per_view, snapshots over time  
  - References: `src/ingestion/models/accounts.py`, `src/ingestion/models/snapshots.py`
- **Video-level metrics + history:** create_time, title, duration, views/likes/comments/shares, completion_rate, engagement_rate, likes_per_view, frequent `VideoSnapshot` history  
  - References: `src/ingestion/models/videos.py`, `src/ingestion/models/snapshots.py`
- **Early anomaly detection:** spikes in views/engagement, rate changes; run summaries/logging  
  - References: `src/ingestion/anomaly.py`, `src/ingestion/services/anomalies.py`, `src/ingestion/models/logs.py`
- **Visitor analytics for your product:** unique visitors/sessions, referrers, top pages (can power “shareable sponsor kit” traffic tracking)  
  - References: `src/analytics/models.py`, `src/dashboard/views.py`
- **Team roles & multi-account access:** owner/manager/viewer  
  - References: `src/ingestion/models/accounts.py`

---

## 5) Key growth levers the product should operationalize
Adam’s features should map directly to levers creators care about:
- **Early velocity matters:** first 30–120 minutes strongly shape distribution → **first-hour alerts + playbooks**
- **Retention/watch-time dominates:** hook and early seconds → **hook/retention health scoring** (using reliable completion/watch metrics where available)
- **Consistency/cadence:** sustain output → **weekly posting goals + habit loops**
- **Experimentation beats intuition:** structured tests → **A/B-style experiments** with stored learnings per creator
- **Live sessions ROI:** correlate lives with follower deltas and income (manual earnings input) → **live ROI overlay**

---

## 6) Differentiating feature ideas (the “not a dashboard” part)
### A) Insight Cards (actionable, timely, precise)
Each card must include:
- What happened, why it matters, how confident we are, what to do next
- Triggers from anomalies, baselines, and cohort comparisons
- Examples:
  - “First-hour velocity is below your baseline: do X within 15 minutes”
  - “This format is decaying slower than your average: repost or iterate”
  - “Your best posting windows are shifting: adjust schedule”

### B) Experiments Engine (core)
- Users choose a **theory** (hypothesis) from a menu (or write their own)
- They produce **2 variants** (or more) and tag them
- System tracks performance over fixed windows (e.g., first 1h/6h/24h/72h)
- Outputs a result:
  - Uplift, confidence indicators, and “what we learned”
  - Stores learnings to personalize future recommendations (experience points)

### C) Gamified learning loops (useful, not gimmicky)
- “Coins/XP” rewarded for actions that correlate with growth:
  - Running experiments, completing missions, staying consistent, reviewing weekly retros
- “Trivia/survey” about their own account:
  - Encourages inductive learning and deeper familiarity with their performance
  - Earn coins for correct answers; unlocks premium-style insights or perks

### D) AI Coach (visible, but intentionally limited in free tier)
- Visible assistant that:
  - Summarizes insights, proposes missions, guides experiments
  - Answers “why” behind recommendations in human terms
- Gated depth so users feel they’ve received value and *want to pay back* to unlock more.

### E) Content attribute guidance (future expansion)
User wants the system to eventually recommend on:
- Duration, camera engagement, video type, dance type, clothing, colors, rhythms, mood/feeling, on-screen captions, topic patterns, etc.
Approach:
- Start with metadata + derived heuristics
- Expand later using lightweight CV/audio models or manual labeling + ML

---

## 7) Pricing ladder concepts (as provided)
Goal: habit-building free tier, then upgrades when users feel “stuck” without advanced alerts/experiments/predictions.

- **Free:** 1 account, 7–30 day history, ≤50 videos, manual refresh or daily refresh, weekly recap, basic cadence + top videos, limited missions/insights
- **Creator (~$19/mo):** 1 account, 180d history, first-hour alerts, best time-to-post, completion trends, simple pillars, CSV export
- **Pro (~$49/mo):** up to 3 accounts, predictive reach via early metrics, Slack/Discord alerts, experiments, live ROI, sponsor kit share page
- **Growth (~$149/mo):** up to 10 accounts, deeper cohort insights, decay/repost recs, weekly idea pack, multi-seat workflows, benchmarks
- **Studio/Agency ($399+/mo):** many accounts, SSO, white-label sponsor kit, report builder, BI export, SLAs

---

## 8) Core pages / experience (high-level)
Desktop-first “pro + playful” UX.
- **Onboarding:** connect TikTok → pick goals → first insight card → first mission
- **Home Dashboard:** growth overview + alerts + mission queue + “next best actions”
- **Videos:** per-video analytics + early velocity + decay curves + replay/repost suggestions
- **Insights Hub:** searchable insight cards with history, confidence, and outcomes
- **Experiments:** hypothesis → variants → measurement → learning stored
- **Goals/Missions:** weekly plan, streaks, rewards; user selects suggested goals
- **Live ROI:** manual earnings input + follower delta overlays (optional)
- **Sponsor Kit (Share Page):** verified rollups + top posts + traffic tracking
- **Settings / Team / Billing:** roles, multi-account access, plan gating

---

## 9) Deployed Architecture (December 2025)

### Multi-Repository Structure (Industry Standard)
Adam is split across **four repositories** with distinct responsibilities:

1. **LenkoStudio Marketing Site** (`lenkostudio.com`)
   - Hosted: Cloudflare Pages
   - Purpose: Main marketing site, company portfolio, blog
   - Tech: Static HTML/CSS (future: Astro or similar)

2. **Adam Landing Page** (`adam` repository → `adam.lenkostudio.com` + `lenkostudio.com/adam`)
   - Hosted: Cloudflare Pages (`adam-8lo.pages.dev`)
   - Custom domains: 
     * Direct: `adam.lenkostudio.com` 
     * Path mount: `lenkostudio.com/adam` (via Cloudflare Worker)
   - Purpose: Product landing page with hero, features, CTA
   - Tech: Static HTML with Tailwind CSS (~95%), inline CSS (~5% for unique elements)

3. **Adam Backend** (`adam-tiktok-ingestion` on GitHub)
   - Hosted: Render.com (free tier, 750h/month)
   - Database: Neon PostgreSQL (`tiktok_db`)
   - Purpose: TikTok API ingestion, data aggregation, anomaly detection, read-only API
   - Tech: Django 4.2+, APScheduler (background jobs), PostgreSQL-based caching
   - API Endpoints (Future):
     * `GET /api/v1/accounts/{id}/metrics`
     * `GET /api/v1/videos/{id}/snapshots`
     * `POST /tiktok/callback` (OAuth)
     * `POST /tiktok/webhook` (TikTok events)

4. **Adam Frontend** (`adam-frontend` - NOT YET CREATED)
   - Planned: Vercel (free tier)
   - Planned domain: `app.adam.lenkostudio.com`
   - Database: Neon PostgreSQL (`adam_users_db` for auth/billing)
   - Purpose: Dashboard, experiments UI, missions, insights cards, AI coach interface
   - Tech: Next.js 14+, React Server Components, Tailwind CSS

### Domain Mapping Strategy
| Domain | Purpose | Technology | Status |
|--------|---------|-----------|--------|
| `lenkostudio.com` | Main marketing site | Cloudflare Pages | ⚠️ DNS propagating |
| `lenkostudio.com/adam` | Adam landing (path mount) | Cloudflare Worker → Pages | ✅ Working |
| `adam.lenkostudio.com` | Adam landing (direct) | Cloudflare Pages | ✅ Working |
| `app.adam.lenkostudio.com` | Adam dashboard (future) | Vercel (Next.js) | ❌ Not created |
| `api.adam.lenkostudio.com` | Backend API (future) | Render (Django) | ❌ Not configured |

### Cloudflare Worker: Path Mounting (`/adam`)
**Purpose:** Transparently mount Adam landing page at `lenkostudio.com/adam` without redirect.

**How it works:**
1. Worker intercepts requests to `lenkostudio.com/adam` and `/adam/*`
2. Strips `/adam` prefix and fetches from `adam-8lo.pages.dev`
3. Rewrites HTML links (e.g., `href="/"` → `href="/adam/"`) to preserve path
4. Returns seamless experience (no redirect, no visible proxy)

**Deployment:** `wrangler deploy` via CLI; active on `lenkostudio.com` zone.

### Technology Decisions (Finalized)

**Frontend Styling: Tailwind CSS as Primary (95%), Inline CSS for One-offs (5%)**
- **Why Tailwind:** Atomic CSS, design system consistency, responsive utilities, production-optimized builds
- **When inline:** Unique animations, one-off spacing tweaks, rapid prototyping
- **Avoids:** Large custom CSS files that duplicate Tailwind utilities

**Backend: Django Monolith (Phase 1), No FastAPI/Redis Yet**
- **Why Django:** ORM, admin panel, APScheduler integration, mature ecosystem
- **Why NOT FastAPI/Redis initially:**
  - Premature optimization for <1000 users
  - Cloudflare edge cache handles 90% of traffic
  - PostgreSQL caching sufficient for Phase 1
  - Less operational complexity (fewer services to monitor/secure)
- **When to reconsider:** 10,000+ concurrent users, WebSocket features, or read-heavy API (>100 req/sec)

**Database: Neon PostgreSQL (2 databases, same cluster)**
- `tiktok_db`: Video metrics, snapshots, aggregates (public data)
- `adam_users_db`: User auth, profiles, billing (PII)
- **Why separate:** Security boundary (PII vs public data)

**Deployment Platforms:**
- Cloudflare Pages: Landing pages (free tier, unlimited bandwidth, global edge)
- Render: Django backend (free tier, 750h/month, auto-sleep after 15min inactivity)
- Vercel: Next.js frontend (free tier, edge functions, automatic optimizations)

**Caching Strategy:**
- **Free tier users:** Edge cache (15-min TTL) via Cloudflare
- **Paid tier users:** Fresh data (1-min TTL or direct DB queries)
- **Implementation:** Feature flags (not separate infrastructure)

---

## 10) Technical Assumptions (Solo Dev, Maintainable)
- Official TikTok API first; third-party comment analysis only if purchased/licensed
- Budget-conscious stack leveraging free tiers (Cloudflare, Render, Vercel, Neon)
- Optional local GPU compute (RTX 4090) for heavier ML in Phase 2+
- Track full website usage and recommendation acceptance to build learning loop
- Multi-repo architecture for security boundaries and scaling independence

---

## 11) Non-Negotiables
- **Reliability & professional feel** (accurate data, stable refresh)
- **Action > vanity metrics**
- **Experiments are central** (hands-on learning loop per creator)
- **Gamification must be useful** (habit formation + learning, not noise)
- **Growth prediction must be honest and calibrated** (no "fake precision")
- **Multi-repo architecture** (security boundaries, independent scaling, deployment isolation)

---

## 12) Open Questions to Resolve Later (Product + Implementation)
- Exact TikTok API scopes/fields available for: traffic source, watch time, completion granularity
- How to represent "accuracy" and uncertainty for predictions without harming trust
- Comment analysis licensing/provider selection (if needed Phase 2+)
- Payment rails: Stripe vs PayPal vs Mercado Pago (sequence + geography)
- When to introduce mobile PWA and/or WhatsApp notifications
- When to migrate from Django monolith to FastAPI read API layer (trigger: 10,000+ users or >100 req/sec)

---

## 13) What You Want an LLM to Do Next
Use this summary to generate:
- A detailed UI/UX + information architecture
- Insight card definitions with formulas, triggers, and confidence scoring
- Experiment engine math (uplift + significance tests + guardrails)
- Database schema extensions (goals, missions, XP/coins, experiments, insights, coach messages)
- API endpoints, background jobs, and plan gating rules
