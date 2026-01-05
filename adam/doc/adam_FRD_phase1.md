# Adam — Functional Requirements Document (FRD) — Phase 1 (TikTok-only MVP)

**Version:** 0.2  
**Date:** 2025-12-19  
**Last Updated:** 2025-12-19 (Deployment architecture sync)  
**Audience:** Solo developer / product owner; future collaborators  
**Goal:** Build a minimum-lovable TikTok-only "AI Manager" that turns limited official API analytics into **action** (missions + experiments) while compounding per-creator learnings over time.

**Deployment Status:**
- ✅ Landing page deployed (Cloudflare Pages: `adam.lenkostudio.com`, `lenkostudio.com/adam`)
- ✅ Backend ingestion service operational (Render: Django + Neon PostgreSQL)
- ❌ Frontend dashboard not yet created (Next.js on Vercel - to be built)

---

## 1) Executive Summary

Adam is a **decision and action** system for early-growth creators (20–35). Phase 1 ships:
- TikTok OAuth connect + periodic ingestion of account + video stats via **official TikTok API v2** endpoints.  
- Time-series snapshots, baselines, and **anomaly triggers**.  
- “Insight Cards” that convert data → recommended next steps.  
- A simple **Experiments Engine** (structured A/B-ish tests) and **Missions** (habit-building tasks) grounded in habit formation evidence (self-monitoring, goal-setting, prompts/cues, reinforcement).  
- A minimal “learning memory” so the product improves per creator (e.g., what posting windows work for them, what experiments they already tried).

**Hard constraint:** Phase 1 must not assume data that the listed endpoints cannot provide. When a goal metric (e.g., live gifts) isn’t available, it must be **user-entered** or out-of-scope.  
**Official API baseline:** Display API + API v2 endpoints described in TikTok docs. [R1][R2][R3][R4]

---

## 2) Evidence Tiers for Requirements

Each requirement is tagged:
- **[A] Evidence-backed** (supported by official platform docs or peer-reviewed / reputable reports)  
- **[B] Plausible** (industry consensus but not proven for every niche)  
- **[C] Speculative** (optional bets; must be behind an “experimental” flag)

---

## 3) Goals, Non-Goals, and Success Metrics

### 3.1 Product Goals
1) **Time-to-first-value ≤ 5 minutes** after TikTok connect (first insights + first mission).  
2) Establish a **weekly ritual loop**: Retro → Plan → Missions → Experiments → Learnings.  
3) Build trust by being **honest about uncertainty** and never faking precision.  
4) Create compounding advantage: per-creator baselines and learnings improve recommendations.

### 3.2 Non-Goals (Phase 1)
- No scraping; **no data outside official TikTok endpoints**. [R1][R3][R4]  
- No full AI “chat coach” (Phase 2).  
- No automated CV/audio understanding (Phase 2).  
- No mobile app. Desktop-first responsive web only.

### 3.3 Phase 1 Success Metrics (Instrumented)
- Activation: `% users completing connect + viewing first 3 insight cards`  
- Habit: `weekly_retention`, `mission_completion_rate`, `streak_length_median`  
- Learning: `experiment_created_rate`, `experiment_completed_rate`, `learning_saved_rate`  
- Value proof: `roi_ledger_entries_created` (even if early estimation)  
- Trust: `insight_dismiss_rate`, `prediction_hidden_rate`, `support_requests_rate`

---

## 4) Users, Roles, and Core Jobs

### 4.1 Personas (Phase 1)
- **Solo Creator (primary):** wants consistency, fast feedback, and growth levers.  
- **Coach/Manager (secondary):** can view, suggest experiments, review progress.  
- **Agency (deferred):** multi-account focus is Phase 2+.

### 4.2 Roles
- **Owner:** can connect TikTok, manage billing, invite team, edit goals.  
- **Manager:** can create missions/experiments, view analytics, add notes.  
- **Viewer:** read-only analytics + insights.

---

## 5) Data Constraints and “Signals Map” (TikTok API Reality)

### 5.1 Available via official endpoints (Phase 1)
- **Account info:** follower_count, following_count, likes_count, video_count (plus profile fields based on scopes). [R2]  
- **Video list:** paginated authorized user videos; max_count up to 20 per request; cursor is a UTC epoch timestamp in ms. [R3]  
- **Video query:** up to 20 video_ids per request; returns Video Object fields incl. id, create_time, cover_image_url, share_url, video_description/title, duration, size, embed link/html, and view/like/comment/share counts. [R4]

### 5.2 Not available (must be user-entered or out-of-scope)
- Live gifts revenue, sponsor income, CPMs: **user input** (Phase 2).  
- Detailed audience demographics / per-viewer data: out-of-scope.  
- Full retention curves / traffic-source breakdown (FYP vs followers): not guaranteed.

---

## 6) Information Architecture (Phase 1)

**Core pages (desktop-first):**
1) Onboarding / Connect TikTok  
2) Dashboard (Today + Week)  
3) Videos (list + filters)  
4) Video Detail (timeline + early window)  
5) Insights Hub (cards feed + search)  
6) Experiments (create + results)  
7) Missions & Goals (weekly plan + streaks)  
8) Settings (team, notifications, data refresh)

**Marketing surface (already deployed in this repo):**
- The Phase 1 funnel includes a multi-page static landing site with interactive, educational demos that explain *why* features matter (not just what they are):
	- Challenge selector personalization
	- Interactive “How it Works” product tour
	- 90-day growth predictor (calculator)
	- First-hour velocity time-graph with “without/with/compare” scenarios

**Deployment Topology:**

| Component | Repository | Hosting | Domain | Database | Status |
|-----------|-----------|---------|--------|----------|--------|
| **Landing Page** | `adam_local` | Cloudflare Pages | `adam.lenkostudio.com`<br>`lenkostudio.com/adam` | None (static) | ✅ Deployed |
| **Backend API** | `adam-tiktok-ingestion` | Render (free tier) | `api.adam.lenkostudio.com` (future) | Neon `tiktok_db` | ✅ Operational<br>❌ API endpoints missing |
| **Frontend Dashboard** | `adam-frontend` | Vercel (free tier) | `app.adam.lenkostudio.com` | Neon `adam_users_db` | ❌ Not created |

**Technology Stack (Finalized):**

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Landing Page** | Static HTML + custom CSS design system + vanilla JS (SVG/canvas) | Fast, cacheable, no backend needed; supports interactive product demos |
| **Backend Framework** | Django 4.2+ | ORM, admin panel, APScheduler, mature ecosystem |
| **Backend Database** | Neon PostgreSQL (`tiktok_db`) | Free tier, serverless, connection pooling |
| **Backend Caching** | PostgreSQL table (indexed) | No Redis needed at <1000 users; edge handles 90% traffic |
| **Backend Scheduler** | APScheduler | In-process jobs, no external queue (Render single-worker) |
| **Backend Deployment** | Render (free tier, 750h/month) | Auto-sleep after 15min, simple deploys, Git integration |
| **Frontend Framework** | Next.js 14+ (planned) | SSR, edge functions, React Server Components |
| **Frontend Database** | Neon PostgreSQL (`adam_users_db`) | Auth, profiles, billing (separate from TikTok data) |
| **Frontend Deployment** | Vercel (planned) | Next.js optimized, edge runtime, automatic scaling |
| **Edge Layer** | Cloudflare Workers + Pages | Path mounting (`/adam`), caching (15-min TTL free, 1-min paid) |
| **API Contract** | REST JSON (Django REST future) | `/api/v1/accounts/{id}/metrics`, `/api/v1/videos/{id}/snapshots` |

**Why Django Monolith (Not FastAPI/Redis) for Phase 1:**
- FastAPI + Redis premature optimization for <1000 users
- Cloudflare edge cache handles 90% of read traffic at <5ms globally
- PostgreSQL indexed lookups (~10ms) vs Redis (~1ms) negligible for low volume
- One less service to monitor, secure, and deploy
- **Migration trigger:** 10,000+ concurrent users OR >100 req/sec sustained

**Multi-Repository Architecture Rationale:**
1. **Security boundary:** Frontend handles PII (auth, billing), backend handles public TikTok data
2. **Scaling independence:** Frontend scales with user traffic, backend scales with TikTok accounts
3. **Deployment isolation:** UI changes don't affect ingestion stability
4. **Technology optimization:** Next.js for UI, Django for data pipelines

---

## 7) Functional Requirements (Phase 1)

### 7.1 Auth & Account Linking

**FR-AUTH-001 [A] (P0): TikTok OAuth connect**  
- Workflow: user clicks Connect → TikTok OAuth → return to app → store tokens.  
- Inputs: TikTok auth code/token; scopes. [R1]  
- Outputs: Connected account record + token vault entry.  
- Acceptance: User sees “Connected” status and first sync starts.  
- Events: `auth.tiktok_connect_started`, `auth.tiktok_connect_succeeded`, `auth.tiktok_connect_failed`.

**FR-AUTH-002 [A] (P0): Token lifecycle management**  
- Refresh/renew tokens per TikTok rules; if expired, prompt reconnect. [R1]  
- Acceptance: no silent failures; stale data is labeled.

---

### 7.2 Data Ingestion & Snapshots

**FR-DATA-001 [A] (P0): Fetch account metrics snapshots**  
- Call `/v2/user/info/` and persist a timestamped snapshot. [R2]  
- Acceptance: daily snapshot stored; latest displayed on dashboard.  
- Events: `sync.user_info.started`, `sync.user_info.succeeded`, `sync.user_info.failed`.

**FR-DATA-002 [A] (P0): Fetch video list and upsert videos**  
- Use `/v2/video/list/` with cursor pagination, max_count ≤ 20. [R3]  
- Acceptance: videos appear in list with metadata; backfill works.  
- Events: `sync.video_list.page_started`, `sync.video_list.page_succeeded`, `sync.video_list.page_failed`.

**FR-DATA-003 [A] (P0): Fetch video metrics via `/v2/video/query/`**  
- Batch refresh metrics for last N videos; 20 IDs per call. [R4]  
- Acceptance: view/like/comment/share update; windows computed.  
- Events: `sync.video_query.batch_started`, `sync.video_query.batch_succeeded`, `sync.video_query.batch_failed`.

**FR-DATA-004 [B] (P1): Variable refresh cadence**  
- Recent videos refresh more frequently; older videos daily.  
- Acceptance: configurable schedule; rate-limiting + backoff.

---

### 7.3 Analytics Baselines & Derived Metrics

**FR-AN-001 [A] (P0): Per-creator baselines**  
- Rolling medians/percentiles for: 1h views, 24h views, engagement rate, share rate.  
- Acceptance: updated daily; shown as “your normal range”.

**FR-AN-002 [A] (P0): Derived ratios**  
- engagement_rate = (likes + comments + shares) / views  
- share_rate = shares / views  
- comment_rate = comments / views  
- Acceptance: displayed on video detail and trends.

---

### 7.4 Insight Cards (Action Primitive)

**FR-INS-001 [A] (P0): Insight Card schema & feed**  
- what happened, why it matters, confidence label, next step, impact range, time sensitivity.  
- Acceptance: can acknowledge/snooze/dismiss.  
- Events: `insight.shown`, `insight.clicked`, `insight.acknowledged`, `insight.dismissed`.

**FR-INS-002 [A] (P0): Baseline deviation triggers**  
- Trigger when a metric deviates from baseline beyond threshold.  
- Acceptance: thresholds adjustable; confidence depends on sample size.

**FR-INS-003 [A] (P1): “Hook” guidance as suggestions**  
- Use TikTok’s public creative guidance (hook/body/close; early seconds matter) as recommendations. [R5]  
- Acceptance: copy avoids algorithm certainty; explains limits.

---

### 7.5 Missions & Weekly Plan (Habit Loop)

**FR-MIS-001 [A] (P0): Weekly goal set + progress**  
- Users set weekly targets; system tracks progress.  
- Why: goal setting + self-monitoring + prompts/cues commonly used in habit DBCIs. [R6]  
- Events: `goal.set`, `goal.progress_updated`, `goal.completed`.

**FR-MIS-002 [A] (P0): Mission generation (rule-based v1)**  
- Generate missions based on anomalies + baselines + preferences.  
- Acceptance: missions are clear and manually checkable.

**FR-MIS-003 [A] (P0): Prompts/cues**  
- On-site cues (optional email) tied to weekly plan. [R6]  
- Events: `cue.scheduled`, `cue.sent`, `cue.clicked`.

---

### 7.6 Experiments Engine (Structured Tests)

**FR-EXP-001 [A] (P0): Experiment object**  
- Fields: hypothesis, metric, window, variants, linked videos, status.  
- Events: `experiment.created`, `experiment.variant_linked`, `experiment.completed`.

**FR-EXP-002 [A] (P0): Measurement windows**  
- Evaluate at 1h/6h/24h/72h from post time.  
- Why: experimentation best practice emphasizes pre-defined windows/guardrails. [R7][R8]

**FR-EXP-003 [B] (P1): “Inconclusive” UX**  
- If sample too small or noise too high, show inconclusive rather than forcing.  
- Acceptance: explicit thresholds.

**FR-EXP-004 [A] (P1): Learning capture**  
- Store a learning record with context + confidence.  
- Acceptance: future missions avoid repeats.

---

### 7.7 Trivia / Reflection (Optional)

**FR-TRIV-001 [A] (P1): Weekly reflection prompts**  
- 1–2 questions/week from user’s own stats.  
- Why: reflection + feedback loops are part of habit-supportive designs. [R6]  
- Acceptance: opt-out; short.

---

## 8) Non-Functional Requirements (Phase 1)

- **Trust:** ranges + confidence; never fake precision.  
- **Performance:** dashboard < 2s for ≤500 videos.  
- **Accessibility:** reduced-motion option; keyboard nav.  
- **Security:** encrypt tokens at rest.  
- **Compliance:** only official endpoints; no scraping. [R1][R3][R4]

---

## 9) Data Model (High-level)

`user`, `team`, `team_member(role)`, `creator_account`, `video`, `account_snapshot`, `video_snapshot`,  
`insight_card`, `goal`, `mission`, `streak`, `experiment`, `experiment_variant`, `experiment_result`,  
`learning`, `event_log`, `notification_preference`

---

## 10) References

- **[R1]** TikTok Display API Overview — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/display-api-overview/
- **[R2]** TikTok API v2 – Get User Info (/v2/user/info/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/
- **[R3]** TikTok API v2 – Video List (/v2/video/list/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-video-list/
- **[R4]** TikTok API v2 – Video Query (/v2/video/query/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-video-query/
- **[R5]** Creative Codes: 6 principles for creating on TikTok (creative best practices) — TikTok For Business (ads.tiktok.com) — **2024 (accessed 2025-12)** — https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads
- **[R6]** Digital Behavior Change Intervention Designs for Habit Formation: Systematic Review (J Med Internet Res 2024;26:e54375) — Journal of Medical Internet Research — **2024-05-24** — https://www.jmir.org/2024/1/e54375/
- **[R7]** A Systematic Literature Review of A/B Testing (Journal of Systems and Software) — Journal of Systems and Software (ScienceDirect) — **2024 (accessed 2025-12)** — https://www.sciencedirect.com/science/article/abs/pii/S0164121224000196
- **[R8]** Sequential Testing Keeps the World Streaming Netflix Part 2 — Netflix TechBlog — **2024-03-21** — https://netflixtechblog.com/sequential-testing-keeps-the-world-streaming-netflix-part-2-c778c0c73e17
- **[R10]** Analyzing User Engagement with TikTok’s Short Format Videos — ACM Digital Library — **2024 (accessed 2025-12)** — https://dl.acm.org/doi/abs/10.1145/3613904.3642433
- **[R12]** TikTok What’s Next 2024 Trend Report (PDF) — TikTok For Business — **2024 (PDF accessed 2025-12)** — https://ads.tiktok.com/business/library/TikTok_Whats_Next_2024_Trend_Report_1.pdf
- **[R13]** Advancing Gamification Research and Practice with Three Underexplored Ideas in Self-Determination Theory — Springer / TechTrends — **2024 (accessed 2025-12)** — https://link.springer.com/article/10.1007/s11528-024-00968-9

