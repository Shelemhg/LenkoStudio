# Adam Platform Architecture

**Last Updated:** December 17, 2025  
**Purpose:** Guide for LLMs and developers to understand the multi-repository architecture, system boundaries, and design decisions.

---

## 🏗️ System Overview

Adam is a **TikTok AI Growth Manager** split across **four repositories** with distinct responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LAYER                          │
│  Browser → lenkostudio.com (marketing)                     │
│  Browser → lenkostudio.com/adam (landing via Worker)       │
│  Browser → app.adam.lenkostudio.com (dashboard - future)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE LAYER                    │
│  • Pages (Static Sites: main site + adam landing)          │
│  • Worker (Path mounting: /adam → adam Pages project)      │
│  • Cache API (15-min TTL for free tier, 1-min for paid)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND REPOSITORY                       │
│  Repository: adam-frontend (Next.js 14+) - NOT CREATED YET │
│  Deployment: Vercel Free Tier                               │
│  Domain: app.adam.lenkostudio.com (planned)                 │
│  Database: Neon PostgreSQL adam_users_db                    │
│  Responsibilities:                                           │
│    • User authentication & authorization (JWT)              │
│    • User profiles, teams, roles                            │
│    • Billing & subscription management                      │
│    • UI/UX rendering & client-side state                   │
│    • Experiments UI, Missions, Insights Cards              │
│    • AI Coach interface                                     │
│  Security: High (PII, payment data, session management)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND REPOSITORY (THIS REPO)                 │
│  Repository: adam-tiktok-ingestion (Django 4.2+)           │
│  Deployment: Render Free Tier (DEPLOYED)                    │
│  Domain: api.adam.lenkostudio.com (future)                  │
│  Database: Neon PostgreSQL tiktok_db                        │
│  Responsibilities:                                           │
│    • TikTok API ingestion (videos, accounts, snapshots)    │
│    • Data aggregation & anomaly detection                  │
│    • Read-only API for frontend consumption (to add)       │
│    • PostgreSQL-based caching layer                        │
│    • Background job orchestration (APScheduler)            │
│  Security: Medium (read-only TikTok data, no PII)         │
│  Status: Ingestion operational, API endpoints missing      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER (SHARED)                      │
│  Neon PostgreSQL (2 databases, same cluster)               │
│    • adam_users_db: User auth, profiles, billing          │
│    • tiktok_db: Video metrics, snapshots, aggregates      │
└─────────────────────────────────────────────────────────────┘
```

### **Domain Mapping (Actual Deployed)**

| Domain | Purpose | Technology | Repository | Status |
|--------|---------|-----------|-----------|--------|
| `lenkostudio.com` | Main marketing site | Cloudflare Pages | `lenkostudio.com` (GitHub) | ⚠️ DNS propagating |
| `lenkostudio.com/adam` | Adam landing (path mount) | Cloudflare Worker → Pages | Worker `adam-path-mount` | ✅ Working |
| `adam.lenkostudio.com` | Adam landing (direct) | Cloudflare Pages | `adam` (GitHub) | ✅ Working |
| `app.adam.lenkostudio.com` | Dashboard (future) | Vercel (Next.js) | `adam-frontend` | ❌ Not created |
| `api.adam.lenkostudio.com` | Backend API (future) | Render (Django) | `adam-tiktok-ingestion` | ❌ Not configured |

### **Cloudflare Worker: Path Mounting Strategy**

**File:** `worker-adam-mount.js` (deployed as `adam-path-mount`)  
**Purpose:** Transparently mount Adam landing page at `/adam` path on main site

**How it works:**
1. Worker intercepts requests to `lenkostudio.com/adam` and `/adam/*`
2. Strips `/adam` prefix from URL path
3. Fetches content from `adam-8lo.pages.dev` (adam Pages project)
4. Rewrites HTML links to preserve `/adam` prefix:
   - `href="/"` → `href="/adam/"`
   - `src="/assets/style.css"` → `src="/adam/assets/style.css"`
5. Handles redirects by rewriting `Location` header
6. Returns seamless experience (no redirect, no visible proxy)

**Deployment:**
```powershell
wrangler deploy worker-adam-mount.js --name adam-path-mount
# Requires wrangler.toml with routes configured
```

**Routes configured:**
- `lenkostudio.com/adam`
- `lenkostudio.com/adam/*`

**Why this approach:**
- Keeps multi-repo benefits (separate deployments, independent updates)
- Maintains clean URLs (no redirect to subdomain)
- Allows main site and adam landing to evolve independently
- Industry standard for mounting separate projects at paths

---

## 🎯 Repository Separation Strategy

### **Why Two Repositories?**

1. **Security Boundary**
   - Frontend handles PII (emails, passwords, payment info) → High security requirements
   - Backend handles public TikTok metrics → Medium security requirements
   - Blast radius containment: compromise of metrics ≠ compromise of user credentials

2. **Scaling Independence**
   - Frontend scales with **user traffic** (interactive, request/response)
   - Backend scales with **TikTok accounts** (batch processing, scheduled jobs)
   - Different scaling triggers require different infrastructure

3. **Deployment Isolation**
   - Frontend: Instant deploys, edge functions, frequent UI changes
   - Backend: Stable deploys, long-running jobs, infrequent changes
   - No frontend deploy can break TikTok ingestion, and vice versa

4. **Technology Optimization**
   - Frontend: Next.js (React SSR, edge runtime, optimal for UI)
   - Backend: Django (ORM, admin panel, scheduler, optimal for data pipelines)
   - Each uses best-in-class tools for their domain

5. **Team Structure Ready**
   - Future frontend developers don't need Django/ingestion knowledge
   - Backend/data engineers don't need React/UI knowledge
   - Clear API contract enables parallel development

---

## 📦 This Repository: `adam` (Adam Landing Page)

### **Core Purpose**
Static landing page for Adam product hosted on Cloudflare Pages.

### **Technology Stack**

| Layer | Technology | Why This Choice |
|-------|-----------|----------------|
| **HTML/CSS** | Static HTML + custom CSS design system (`css/adam-styles.css`) | Fast, cacheable, no build step needed; consistent tokens via CSS variables |
| **Hosting** | Cloudflare Pages | Free tier, unlimited bandwidth, global edge |
| **Custom Domains** | adam.lenkostudio.com (direct)<br>lenkostudio.com/adam (Worker mount) | Multiple access patterns |
| **Deployment** | Git push or wrangler CLI | Automatic deploys on push to main |

### **Content**
- Multi-page static site: `index.html`, `adam-features.html`, `adam-pricing.html`, `adam-about.html`
- Hero section with CTA + 3D dashboard preview (communicates “what the app feels like”)
- Interactive “challenge selector” personalization (user picks a pain → tailored explanation)
- Interactive “How It Works” tabs with purpose-built visuals:
   - Data pipeline sync simulation (connect → secure sync)
   - Neural scan visualization (analysis → pattern discovery)
   - Growth trajectory comparison (strategy → projected compounding)
- Interactive calculators/demos:
   - 90‑day growth predictor (inputs → projection chart)
   - First‑hour velocity time graph with scenario toggle (“without / with / compare”) + intervention marker
- Testimonials carousel + scroll-triggered reveals and motion (with reduced-motion support)
- “Interstellar” dark theme (blue/cyan accents) via CSS variables

### **Deployment Commands**
```powershell
# Deploy landing page
wrangler pages deploy . --project-name adam

# Add custom domain (via Dashboard only, CLI not supported)
# Navigate to: Pages → adam → Custom domains → Add custom domain
```

---

## 📦 Backend Repository: `adam-tiktok-ingestion`

### **Core Purpose**
Data ingestion engine that reliably fetches, stores, and serves TikTok analytics data.

### **Technology Stack**

| Layer | Technology | Why This Choice |
|-------|-----------|----------------|
| **Framework** | Django 4.2+ | ORM, admin panel, mature ecosystem |
| **Database** | Neon PostgreSQL | Free tier, connection pooling, serverless |
| **Scheduler** | APScheduler 3.10 | In-process jobs, no external dependencies |
| **Web Server** | Gunicorn | Production-grade WSGI server |
| **Deployment** | Render Free Tier | 750h/month, auto-sleep, simple deploys |
| **Caching** | PostgreSQL Table | Reuse existing DB, no Redis needed at this scale |
| **API** | Django REST (future) | Serve data to frontend via JSON API |

### **Database Schema**

All tables prefixed with `tiktok_` for namespace isolation:

```sql
-- Account Management
tiktok_accounts          -- TikTok profiles, credentials, tier limits
tiktok_credentials       -- OAuth tokens (encrypted)
tiktok_account_snapshots -- Historical account rollups

-- Video Tracking
tiktok_videos            -- Video metadata + current metrics
tiktok_video_snapshots   -- Historical video metrics (30-min cadence)

-- System Operations
tiktok_ingest_logs       -- Job execution history
tiktok_api_cache         -- Query result caching (15-min TTL)
tiktok_health_metrics    -- Resource monitoring (RAM, CPU, DB)
```

### **Key Design Decisions**

#### **1. No Redis (PostgreSQL Caching Instead)**
**Decision:** Use indexed PostgreSQL table for caching instead of Redis.

**Reasoning:**
- At <1000 users, PostgreSQL indexed lookups (~10ms) vs Redis (~1ms) is negligible
- Cloudflare edge cache handles 90% of traffic at <5ms globally
- Redis adds operational complexity (connection management, eviction policies)
- PostgreSQL provides transactional consistency and durability
- One less service to monitor, secure, and pay for

**When to Reconsider:** 10,000+ concurrent users or real-time WebSocket features

#### **2. APScheduler (Not Celery)**
**Decision:** Use APScheduler for background jobs instead of Celery + RabbitMQ.

**Reasoning:**
- Single-worker architecture on Render free tier (no horizontal scaling needed)
- APScheduler runs in-process (no message broker required)
- Simpler deployment (one service instead of three)
- Sufficient for 30-minute ingestion cadence
- Render's "always-on" prevents sleep with regular health checks

**When to Reconsider:** Multiple workers needed or sub-minute job latency required

#### **3. Django Monolith (Not FastAPI Microservices)**
**Decision:** Keep ingestion + API serving in single Django app.

**Reasoning:**
- Shared ORM models reduce duplication
- Django admin panel for manual interventions
- FastAPI adds value for async I/O, but ingestion is I/O-bound with waits anyway
- Simpler for solo developer (one codebase to maintain)
- Can extract API layer later if needed (Django REST Framework → FastAPI migration path)

**When to Reconsider:** Frontend needs <50ms API responses or async streaming required

#### **4. Neon PostgreSQL (Not Amazon RDS)**
**Decision:** Use Neon's serverless PostgreSQL instead of traditional managed Postgres.

**Reasoning:**
- Free tier: 0.5GB storage + connection pooling (sufficient for 175 accounts)
- Auto-pause when idle (cost savings)
- Instant branching (test migrations on branches)
- PostgreSQL 16 (modern features like JSONB improvements)
- No connection limit issues with built-in PgBouncer

**Limitations:** No pgvector yet (if AI embeddings needed, reconsider)

---

## 🔌 API Contract (Backend ↔ Frontend)

### **Authentication Strategy**

```
Frontend generates JWT → Includes user_id + tier
Backend validates JWT → Checks signature only (no user DB lookup)
```

**Why this works:**
- Backend doesn't need user database access
- Frontend controls authentication (single source of truth)
- JWT claims include everything backend needs: `user_id`, `tier`, `tiktok_account_ids[]`
- Stateless (no session storage needed)

### **Planned Endpoints**

```python
# Read-only data serving (to be implemented)

GET /api/v1/accounts/{tiktok_account_id}/metrics
# Returns: current followers, views, likes, engagement_rate

GET /api/v1/accounts/{tiktok_account_id}/snapshots?days=30
# Returns: historical account rollups (for charts)

GET /api/v1/videos/{tiktok_account_id}?limit=50&sort=views
# Returns: video list with current metrics

GET /api/v1/videos/{video_id}/snapshots?hours=72
# Returns: historical video metrics (for velocity curves)

GET /api/v1/videos/{video_id}/anomalies
# Returns: detected spikes, drops, or unusual patterns

GET /api/v1/insights/{tiktok_account_id}
# Returns: actionable insight cards (future)
```

**Response Caching Headers:**
```python
# Free tier: 15-minute cache
"Cache-Control": "public, max-age=900"

# Paid tier: 1-minute cache
"Cache-Control": "public, max-age=60"
```

### **Rate Limiting Strategy**

Implemented at Cloudflare Worker level (not backend):
- Free tier: 10 requests/minute/user
- Paid tiers: 100 requests/minute/user
- Backend never sees rate-limited requests (rejected at edge)

---

## 🔒 Security Model

### **This Repository (Low-Risk Data)**

**What We Store:**
- ✅ Public TikTok metrics (views, likes, comments)
- ✅ Video metadata (title, duration, create_time)
- ✅ OAuth tokens (encrypted, TikTok API only)

**What We DON'T Store:**
- ❌ User emails, passwords, payment info
- ❌ Personal identifiable information (PII)
- ❌ Session tokens or user credentials

**Security Measures:**
1. TikTok OAuth tokens encrypted at rest (Django `Fernet`)
2. Read-only API (no data modification via API)
3. JWT validation (shared secret with frontend)
4. Environment variables for secrets (never in code)
5. Neon connection string uses SSL

### **Frontend Repository (High-Risk Data)**

**Security Requirements:**
- User authentication (NextAuth.js or Clerk)
- Password hashing (bcrypt/Argon2)
- Payment processing (Stripe, PCI compliant)
- CSRF protection
- XSS sanitization
- Rate limiting (Cloudflare)
- Session management (httpOnly cookies)

---

## 🚀 Data Flow Examples

### **Example 1: User Views Dashboard**

```
1. User logs in → Frontend generates JWT with claims:
   {
     "user_id": 123,
     "tier": "creator",
     "tiktok_accounts": [456, 789]
   }

2. User navigates to Dashboard → Frontend requests:
   GET /api/v1/accounts/456/metrics
   Headers: Authorization: Bearer <JWT>

3. Cloudflare Worker intercepts:
   - Checks cache → HIT (data from 5 minutes ago)
   - Returns cached response (no backend request)

4. If cache MISS:
   - Worker forwards to Backend (Render)
   - Backend validates JWT signature
   - Backend queries PostgreSQL cache table
   - If cache valid (< 15 min old) → return cached
   - If cache expired → query tiktok_accounts table
   - Store in cache table with 15-min TTL
   - Return response with Cache-Control header
   - Worker caches response at edge

5. User sees dashboard in <100ms (edge cache) or <500ms (backend)
```

### **Example 2: Background Ingestion**

```
1. APScheduler triggers job every 30 minutes

2. Orchestrator service:
   - Fetches all tiktok_accounts (mapped=TRUE)
   - For each account:
     - Query TikTok API for videos posted <72h ago
     - Calculate deltas (current metrics - last snapshot)
     - Create new VideoSnapshot records
     - Run anomaly detection (spike/drop thresholds)

3. If anomaly detected:
   - Store in tiktok_anomalies table
   - Future: Webhook to frontend for real-time alerts

4. Cache invalidation:
   - Delete stale entries from tiktok_api_cache
   - Cloudflare cache expires naturally after TTL

5. Next user request gets fresh data
```

---

## 📊 Caching Strategy (Three Layers)

### **Layer 1: Cloudflare Edge Cache** (Global, Free)
- **TTL:** 15 minutes (free tier), 1 minute (paid tier)
- **Scope:** All GET requests with Cache-Control headers
- **Benefit:** 90% of requests never hit backend (served in <50ms globally)
- **Purging:** Automatic via TTL expiration

### **Layer 2: PostgreSQL Cache Table** (Centralized, Free)
```python
class APICache(models.Model):
    key = models.CharField(max_length=255, unique=True, db_index=True)
    value = models.JSONField()
    expires_at = models.DateTimeField(db_index=True)
    
    class Meta:
        db_table = 'tiktok_api_cache'
        indexes = [
            models.Index(fields=['key', 'expires_at']),
        ]
```
- **TTL:** 15 minutes (programmatic control)
- **Scope:** Database query results (account metrics, video lists)
- **Benefit:** Reduces PostgreSQL load when edge cache misses
- **Purging:** Background job deletes expired rows hourly

### **Layer 3: Django QuerySet Caching** (Optional, In-Memory)
```python
from django.core.cache import cache

def get_account_metrics(account_id):
    cache_key = f'account_metrics:{account_id}'
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    data = TikTokAccount.objects.get(id=account_id).to_dict()
    cache.set(cache_key, data, timeout=300)  # 5 minutes
    return data
```
- **TTL:** 5 minutes (for hot data)
- **Scope:** Frequently accessed objects (current user's accounts)
- **Benefit:** Sub-millisecond lookups for repeated requests
- **Limitation:** Lost on server restart (Render free tier sleeps)

---

## 🎯 Scaling Triggers & Migration Paths

### **Current Capacity (All Free Tiers)**
- **Accounts:** 175 TikTok accounts (with current cadence strategy)
- **Users:** ~500 users (assuming 3 accounts per paid user average)
- **API Requests:** ~50,000/day (Cloudflare handles via edge cache)
- **Database:** ~100MB of 500MB used (room for 5x growth)
- **RAM:** 152MB of 512MB used (room for 3x growth)

### **When to Upgrade**

| Threshold | Action | Cost Impact |
|-----------|--------|-------------|
| **200+ accounts** | Optimize cadence (reduce snapshots for old videos) | Free |
| **1,000 users** | Add Render paid tier ($7/mo for always-on) | +$7/mo |
| **10,000 users** | Migrate to FastAPI + Redis, add Neon Scale | +$30/mo |
| **100,000 users** | Multi-region deployment, read replicas, CDN | +$200/mo |

### **Future Architecture (10,000+ Users)**

```
Cloudflare Workers (Global Edge)
    ↓
FastAPI (Render) [Read API] → Redis (Upstash) → Neon (Read Replica)
    ↓
Django (Render) [Ingestion Only] → Neon (Primary)
```

**Why split at scale:**
- FastAPI: Async I/O for 10x throughput vs Django
- Redis: Sub-millisecond cache for real-time dashboards
- Read Replica: Separate read traffic from write traffic
- Django stays for ingestion (doesn't need to scale as much)

---

## 🛠️ Developer Experience

### **Local Development**
```bash
# Backend (this repo)
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver

# Frontend (separate repo)
npm install
npm run dev
# Connects to production backend or local backend via .env
```

### **Deployment**
```bash
# Backend
git push origin master
# Render auto-deploys, runs build.sh, starts gunicorn

# Frontend
git push origin main
# Vercel auto-deploys, runs build, deploys to edge
```

### **Monitoring**
```python
# Health check endpoint (both repos)
GET /healthz/

# Backend response:
{
  "status": "healthy",
  "database": "connected",
  "scheduler": "running",
  "last_ingestion": "2025-12-17T14:30:00Z",
  "accounts": 2,
  "videos": 394
}

# Frontend response:
{
  "status": "healthy",
  "database": "connected",
  "next_build": "2025-12-17T10:00:00Z"
}
```

---

## 📈 Future Enhancements

### **Phase 1: Complete MVP** (Next 1-2 months)
- [ ] Build adam-frontend Next.js repository
- [ ] Implement Django REST Framework endpoints in backend
  - `GET /api/v1/accounts/{id}/metrics`
  - `GET /api/v1/videos/{id}/snapshots`
  - `POST /tiktok/callback` (OAuth)
  - `POST /tiktok/webhook` (TikTok events)
- [ ] Add JWT validation middleware to backend
- [ ] Configure custom domain `api.adam.lenkostudio.com` for backend
- [ ] Deploy frontend to Vercel at `app.adam.lenkostudio.com`
- [ ] Connect frontend to backend API

### **Phase 2: Advanced Features** (3-6 months)
- [ ] Insight cards generation (anomaly → actionable recommendation)
- [ ] Experiment tracking (A/B test results)
- [ ] Missions & Goals UI with gamification
- [ ] AI Coach interface (LLM-powered explanations)
- [ ] Content labeling (manual tagging → ML-assisted)
- [ ] Predictive metrics (early velocity → 24h forecast)
- [ ] Webhook support (real-time alerts)

### **Phase 3: Scale Preparation** (6-12 months, 10,000+ users)
- [ ] Migrate to FastAPI for read API (keep Django for ingestion)
- [ ] Add Redis for hot data caching (Upstash)
- [ ] Implement read replicas for database
- [ ] Add monitoring (Sentry, Datadog, or similar)
- [ ] Cloudflare Worker for API rate limiting + caching
- [ ] Horizontal scaling (multiple Render instances)

---

## 🎯 Current Status Summary

| Component | Repository | Status | Next Action |
|-----------|-----------|--------|-------------|
| **Marketing Site** | `lenkostudio.com` | ⚠️ DNS propagating | Wait for DNS, verify deployment |
| **Landing Page** | `adam_local` | ✅ Deployed | Add analytics tracking |
| **Worker Mount** | `adam-path-mount` | ✅ Working | Monitor performance |
| **Backend Ingestion** | `adam-tiktok-ingestion` | ✅ Operational | Add API endpoints |
| **Frontend Dashboard** | `adam-frontend` | ❌ Not created | Initialize Next.js project |
| **Backend API** | `adam-tiktok-ingestion` | ❌ Missing endpoints | Implement Django REST |
| **OAuth Flow** | `adam-tiktok-ingestion` | ❌ Missing callback | Add `/tiktok/callback` route |

---

## 🔗 Related Documentation

- `WORKER_DEPLOY.md`: Cloudflare Worker deployment guide for path mounting
- `MIGRATION_GUIDE.md`: Guide for migrating main site from GitHub Pages to Cloudflare Pages
- `worker-adam-mount.js`: Worker code for transparently mounting /adam path
- `wrangler.toml`: Worker configuration with route patterns
- `adam_project_summary_for_llm_download.md`: Comprehensive project vision
- `adam_FRD_phase1.md`: Phase 1 functional requirements
- `adam_FRD_phase2.md`: Phase 2 requirements with migration path
- `RECOMMENDATIONS.md`: Original architecture recommendations (some conflicts resolved)
- [ ] Load testing (identify bottlenecks before they matter)

---

## 🤔 Architectural Decisions Log

### **Why Django instead of FastAPI?**
- Django ORM reduces boilerplate for complex queries
- Admin panel invaluable for debugging and manual fixes
- Mature ecosystem (APScheduler, Django REST, etc.)
- FastAPI's async benefits don't matter for batch ingestion
- Can migrate read API later if needed

### **Why Neon instead of traditional PostgreSQL?**
- Free tier sufficient for MVP (0.5GB storage)
- Connection pooling prevents "too many connections" errors
- Instant branching for safe schema migrations
- Auto-pause reduces costs when inactive
- Modern features (JSONB, partitioning) work out of the box

### **Why no message queue (RabbitMQ/SQS)?**
- 30-minute ingestion cadence doesn't need sub-second latency
- Single worker on free tier (no task distribution needed)
- APScheduler sufficient for scheduled jobs
- Simpler deployment (one service vs three)
- Can add later if real-time ingestion required

### **Why separate frontend and backend repos?**
- Security boundary (PII vs public metrics)
- Scaling independence (user traffic vs ingestion jobs)
- Technology optimization (Next.js vs Django)
- Team structure ready (frontend/backend specialists)
- Deployment isolation (UI changes don't affect ingestion)

---

## 📚 Related Documentation

- **[README.md](README.md)** - Quick start and system status
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- **[SMART_SYNC_STRATEGY.md](docs/SMART_SYNC_STRATEGY.md)** - Ingestion cadence logic
- **[CORRECTED_RAM_ANALYSIS.md](docs/optimization_analysis/CORRECTED_RAM_ANALYSIS.md)** - Capacity planning
- **Frontend Repository:** (To be created) - UI/UX, user management, experiments

---

## 🎓 For LLMs Reading This

**This repository is the "backend data engine" of a two-repository system:**

1. **When discussing user features** (login, billing, experiments UI):
   - These belong in the **frontend repository** (not here)
   - This repo provides data via read-only API
   - Frontend handles all user-facing logic

2. **When discussing data ingestion** (TikTok API, snapshots, aggregation):
   - These belong in **this repository**
   - Focus on reliability, efficiency, and data quality
   - Serve data to frontend, don't render it

3. **When discussing caching**:
   - Cloudflare edge cache is primary (fastest, free, global)
   - PostgreSQL cache table is secondary (centralized, durable)
   - Redis is NOT used (unnecessary at current scale)

4. **When discussing security**:
   - This repo has medium security requirements (OAuth tokens only)
   - Frontend has high security requirements (user credentials, payments)
   - JWT validation is the bridge (frontend signs, backend verifies)

5. **When proposing new features**:
   - Ask: "Does this need user data?" → Frontend repo
   - Ask: "Does this process TikTok data?" → This repo
   - API endpoints bridge the two (clear contract)

**Key Constraint:** Solo developer, free tiers, must stay simple. Avoid over-engineering.
