# Adam — Functional Requirements Document (FRD) — Phase 2 (AI + Content Understanding + Monetization)

**Version:** 0.2  
**Date:** 2025-12-19  
**Last Updated:** 2025-12-19 (Architecture clarity + migration path)  
**Audience:** Solo developer / product owner  
**Goal:** Add **content understanding** (manual → assisted → automated), an honest **AI Coach**, stronger experiments, and a trust-first **monetization ladder**.

**Phase 1 Foundation (Required):**
- ✅ Django backend on Render with TikTok API ingestion
- ✅ Neon PostgreSQL with `tiktok_db` (metrics) and `adam_users_db` (auth/billing)
- ✅ Landing page on Cloudflare Pages
- ❌ Next.js dashboard on Vercel (to be built in Phase 1)

**Phase 2 Adds (10,000+ users or feature demand triggers):**
- AI Coach (LLM-powered explanations + experiment suggestions)
- Content intelligence (manual tagging → ML-assisted)
- FastAPI read API layer (optional, if Django becomes bottleneck)
- Advanced experiments (sequential monitoring, Bayesian intervals)

---

## 1) Executive Summary

Phase 2 upgrades Adam from “analytics + action” to a **learning system**:
- AI Coach that explains “why” and proposes next experiments (bounded, honest).  
- Content intelligence via **manual tagging + concierge** (founder) and optional paid automation.  
- Stronger experiments with sequential/Bayesian monitoring and guardrails (for small creators).  
- Monetization and ROI proof: “Growth ROI Ledger”, before/after timeline, credit-based metering for AI.  
- Collaboration upgrades (multi-account, agency-ready patterns).

---

## 2) Content Intelligence (Manual → Assisted → Automated)

**FR-LABEL-001 [A] (P0): Fast labeling UX**  
- 6–12 quick labels per video; 5–15 seconds to tag.  
- Why: content features correlate with engagement; labeling enables segmentation even with limited API fields. [R10][R11]

**FR-LABEL-002 [A] (P0): Label-based performance views**  
- Compare metrics by label and combinations (guardrails for low N).

**FR-LABEL-003 [B] (P1): Concierge tagging (upsell)**  
- Founder/admin can tag creator’s backlog.

**FR-ML-001 [B] (P1): Paid label suggestions**  
- On-demand CV/audio/NLP to suggest labels; never auto-apply; show confidence.

---

## 3) AI Coach (Bounded + Honest)

**FR-COACH-001 [A] (P0): Explain insights**  
- Coach answers “why” by referencing metrics + baselines; clarifies data limits.

**FR-COACH-002 [B] (P1): Propose missions/experiments**  
- Suggest next best tests using anomalies + labels + past learnings.

**FR-COACH-003 [A] (P0): Safety + bounds**  
- No “guaranteed viral”; no forbidden topics; uncertainty language required.

---

## 4) Experiments Engine v2 (Math + UX)

**FR-EXP2-001 [A] (P0): Guardrail metrics**  
- Each experiment defines primary metric + guardrails. [R7][R8]

**FR-EXP2-002 [A] (P0): Sequential monitoring**  
- Allow check-ins with sequential-friendly methods to avoid false positives. [R8][R9]

**FR-EXP2-003 [B] (P1): Bayesian intervals**  
- Present uplift as a credible interval range when data suffices; otherwise inconclusive.

**FR-EXP2-004 [A] (P0): Learning memory integration**  
- Learnings influence future suggestions (avoid repeats, personalize).

---

## 5) Monetization (Trust-first ROI Ladder)

**FR-MON-001 [A] (P0): Tiered packaging**
- Free, Starter (low ticket), Pro, Agency, Add-ons.

**FR-ROI-001 [A] (P0): Growth ROI Ledger**
- Log interventions, outcome ranges, confidence; avoid inflated sums.

**FR-ROI-002 [A] (P0): Before/After timeline**
- Timeline view for metric change + interventions.

**FR-CRED-001 [A] (P0): Credits wallet**
- Credits for AI usage with caps/warnings; prepaid packs.

**FR-BILL-001 [B] (P0): Subscription billing**
- Subscription lifecycle; invoices; cancellation.

---

## 6) Premium Studio UX & Motion

**FR-UX-001 [A] (P0): Motion with purpose**
- Motion indicates hierarchy/time-sensitivity; reduced-motion support.
- Practical patterns (already validated in the deployed landing experience):
	- Scenario toggles that change the visualization state (e.g., “without / with / compare”) instead of decorative animation.
	- Time-based animations that teach causality (e.g., first-hour curve draws → alert marker appears → recovery curve draws).
	- Tabbed product tours (Connect/Analyze/Grow) that pair copy with an illustrative visual.
	- Scroll-triggered reveals for information hierarchy (use IntersectionObserver; honor `prefers-reduced-motion`).

**FR-UX-002 [A] (P0): Data-art, not decoration**
- Every visual maps to a metric/baseline/decision.
- Concrete mappings to keep:
	- “Pipeline sync” visual = secure ingestion + refresh cadence (connect → sync → data arrives).
	- “Neural scan” visual = pattern discovery (best hook, peak time, top format) rather than generic AI.
	- “Growth trajectory” visual = expected compounding over a defined horizon (e.g., 90 days).
	- “First-hour velocity” visual = early distribution window (30–120 minutes) + intervention timing.

---

## 7) Architecture Migration Path (Phase 1 → Phase 2)

### When to Introduce FastAPI Read API Layer

**Triggers (any of):**
1. Django backend handles >100 sustained req/sec (current: <10 req/sec)
2. 10,000+ concurrent users
3. WebSocket features needed (real-time updates)
4. Read queries causing write-job contention (APScheduler conflicts)

**Migration Strategy:**
1. **Phase 2a:** Keep Django for writes (ingestion, OAuth, admin) + add FastAPI read API
2. **Phase 2b:** Dual-write to both databases during migration (Django → FastAPI gradually)
3. **Phase 2c:** Frontend switches from Django API → FastAPI API (feature flag rollout)
4. **Phase 2d:** Django becomes write-only (ingestion service), FastAPI becomes read-only (public API)

**Technology:**
- FastAPI 0.100+ with async PostgreSQL (asyncpg)
- Deploy on separate Render instance (or upgrade Django instance to paid tier)
- Shared Neon database (read replicas if needed)
- Redis caching layer (Upstash free tier: 10k requests/day)

**Why NOT Phase 1:**
- Premature optimization: Cloudflare edge cache handles 90% of traffic
- Operational complexity: Two services to deploy, monitor, secure
- Cost: Render free tier has 750h/month limit (one service fits, two might not)

### When to Introduce Redis Caching

**Triggers (any of):**
1. Cloudflare Cache hit rate drops below 80% (current: ~90%+)
2. PostgreSQL query latency >50ms p95 (current: <10ms)
3. Real-time features need pub/sub (WebSockets, live notifications)
4. Session management needs distributed cache (multiple backend instances)

**Implementation:**
- Upstash Redis (free tier: 10k requests/day, 256MB storage)
- Use for: hot data (recent videos, active experiments), session store, rate limiting
- TTL strategy: 1-min for paid users, 15-min for free users (match Cloudflare edge)

### Content Understanding ML Pipeline

**Phase 2a (Manual Tagging):**
- Founder/admin tags backlog videos with 6-12 labels
- Concierge service: $50/month for 100 videos/month tagged
- Build training dataset (N=1000+ labeled videos)

**Phase 2b (ML-Assisted):**
- Train lightweight CV model on labels (duration, shot types, text overlays)
- Deploy on RTX 4090 local GPU or Runpod serverless (~$0.10/hour)
- Suggest labels with confidence scores; user confirms/rejects
- Active learning loop: corrections improve model

**Phase 2c (Automated):**
- Auto-tag new videos with high-confidence labels (>80% confidence)
- Low-confidence goes to review queue
- Track precision/recall; roll back if accuracy drops <70%

---

## 8) Data Model Additions (Phase 2)

Add: `label`, `video_label`, `label_suggestion`, `coach_thread`, `coach_message`,  
`credit_wallet`, `credit_ledger`, `purchase`, `subscription`, `invoice`, `roi_entry`, `report_export`

---

## 9) References

- **[R1]** TikTok Display API Overview — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/display-api-overview/
- **[R2]** TikTok API v2 – Get User Info (/v2/user/info/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/
- **[R3]** TikTok API v2 – Video List (/v2/video/list/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-video-list/
- **[R4]** TikTok API v2 – Video Query (/v2/video/query/) — TikTok Developers — **2025-12 (accessed)** — https://developers.tiktok.com/doc/tiktok-api-v2-video-query/
- **[R5]** Creative Codes: 6 principles for creating on TikTok (creative best practices) — TikTok For Business (ads.tiktok.com) — **2024 (accessed 2025-12)** — https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads
- **[R6]** Digital Behavior Change Intervention Designs for Habit Formation: Systematic Review (J Med Internet Res 2024;26:e54375) — Journal of Medical Internet Research — **2024-05-24** — https://www.jmir.org/2024/1/e54375/
- **[R7]** A Systematic Literature Review of A/B Testing (Journal of Systems and Software) — Journal of Systems and Software (ScienceDirect) — **2024 (accessed 2025-12)** — https://www.sciencedirect.com/science/article/abs/pii/S0164121224000196
- **[R8]** Sequential Testing Keeps the World Streaming Netflix Part 2 — Netflix TechBlog — **2024-03-21** — https://netflixtechblog.com/sequential-testing-keeps-the-world-streaming-netflix-part-2-c778c0c73e17
- **[R9]** Experimentation Platforms Meet Reinforcement Learning (Bayesian sequential monitoring) — ACM SIGKDD — **2023 (accessed 2025-12)** — https://dl.acm.org/doi/10.1145/3580305.3599445
- **[R10]** Analyzing User Engagement with TikTok’s Short Format Videos — ACM Digital Library — **2024 (accessed 2025-12)** — https://dl.acm.org/doi/abs/10.1145/3613904.3642433
- **[R11]** Características de los videos que favorecen el engagement en TikTok — Revista Latina de Comunicación Social — **2024 (accessed 2025-12)** — https://nuevaepoca.revistalatinacs.org/index.php/revista/article/view/2232/4835
- **[R12]** TikTok What’s Next 2024 Trend Report (PDF) — TikTok For Business — **2024 (PDF accessed 2025-12)** — https://ads.tiktok.com/business/library/TikTok_Whats_Next_2024_Trend_Report_1.pdf
- **[R13]** Advancing Gamification Research and Practice with Three Underexplored Ideas in Self-Determination Theory — Springer / TechTrends — **2024 (accessed 2025-12)** — https://link.springer.com/article/10.1007/s11528-024-00968-9

