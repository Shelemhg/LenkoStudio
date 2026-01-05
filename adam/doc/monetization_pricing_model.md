# AI Manager – Monetization, Incentives & Commitment Model

## Purpose of This Document

This document formally specifies the **monetization, incentive, and commitment mechanics** of the AI Manager service for TikTok content creators.

It is written to be **machine-readable by another LLM** and precise enough for:
- Product design
- Pricing logic
- Abuse prevention
- UX and copy derivation

The **functional product behavior** is documented elsewhere. This document focuses on **how value, effort, risk, and payment are exchanged**.

---

## Design Intent (Non-Negotiables)

The system is designed to:

1. **Create daily behavioral gravity** (habit formation)
2. **Reward honesty, effort, and consistency**
3. **Penalize broken commitments, not bad luck**
4. **Tie cost to outcomes in a mathematically fair way**
5. **Prevent free-riding and disengaged users**

This is not a SaaS billing model.  
It is a **behavioral economy**.

---

## Core Currency: Coins (Internal Unit of Value)

### Definition

**Coins** are a non-cash, internal currency used to:
- Access AI Manager intelligence
- Activate Growth Challenges
- Pay for advanced or tailored analysis

Coins are:
- Earnable (via engagement)
- Spendable (on value)
- Burnable (on failed or completed challenges)

Coins are **not refundable to fiat**.

---

## Coin Earning (Daily Farming System)

### 1. Daily Visit Reward

- Each calendar day the user visits the platform:
  - They earn a small, fixed number of coins

Purpose:
- Establish daily habit loops
- Create opportunity cost for absence
- Increase psychological platform attachment

Key principle:
> *Not visiting feels like losing something.*

---

### 2. Self-Disclosure & Insight Tasks

Users can earn additional coins by:
- Answering structured questionnaires
- Reflecting on struggles, fears, frustrations
- Describing creator goals and bottlenecks

These tasks are:
- Short
- Optional
- Framed as self-discovery, not data extraction

Psychological basis:
- Self-disclosure increases perceived partnership
- Effort justification increases perceived value

---

### 3. Ongoing Micro-Contributions

Coins may also be earned through:
- Periodic check-ins
- Feedback on past challenges
- Clarifying constraints (time, energy, confidence)

This ensures:
- Continual model improvement
- Reduced hallucinated advice
- Creator feels "heard"

---

## Why Coins (Instead of Direct Money)

Coins introduce:

- **Psychological decoupling** from money
- **Reduced pain of payment**
- **Increased willingness to experiment**
- **Clear effort → value exchange**

Fiat money is only introduced at **coin recharge moments**, not at decision moments.

---

## Spending Coins: AI Manager Access Layers

Coins can be exchanged for:

1. **LLM-grade strategic answers**
   - Research-level marketing insights
   - Context-aware creator advice

2. **Growth Challenges** (primary value unit)
   - Commitment-based growth experiments

---

## Growth Challenges (Core Monetization Unit)

### Definition

A **Growth Challenge** is a bounded contract between:
- The creator (execution responsibility)
- The platform (analysis + monitoring responsibility)

Each challenge explicitly defines:

- Required actions (e.g. post frequency, live structure)
- Time window (e.g. 7–30 days)
- Success metrics (followers, views, engagement)
- Expected growth range (probabilistic, not absolute)
- Coin cost (stake)

---

## Commitment Logic (Who Is Responsible for What)

Responsibility is split cleanly:

- **Creator controls execution**
- **Platform controls analysis, monitoring, and evaluation**

This distinction is central to fairness.

---

## Monitoring & Verification

The platform:

- Monitors public TikTok metrics
- Verifies required actions (posting, lives, cadence)
- Detects non-compliance objectively

No self-reporting is relied upon for enforcement.

---

## Outcome Resolution & Coin Settlement

At the end of a challenge, one of four outcomes applies:

---

### Case A — Full Compliance + Full Success

- Creator completed all required actions
- Target growth band is fully reached

Result:
- **100% of staked coins are consumed**

Rationale:
- Value delivered as promised

---

### Case B — Full Compliance + Partial Success

- Creator completed all required actions
- Growth achieved is **X% of promised range**

Result:
- **X% of coins are consumed**
- Remaining coins are returned

Example:
- 80% of expected growth → platform keeps 80% of coins

Rationale:
- Proportional fairness
- Shared downside risk

---

### Case C — Non-Compliance (Broken Commitment)

- Required actions were not completed
- Platform verification confirms failure to execute

Result:
- **Penalty fee applied (e.g. 50% of coins consumed)**
- Remaining coins may be returned or burned

Rationale:
- Penalize broken promises, not bad outcomes
- Preserve seriousness of challenges

---

### Case D — Platform Failure / Invalid Measurement

- Data unavailable or corrupted
- Monitoring error acknowledged

Result:
- **100% coins returned**

Rationale:
- Trust preservation

---

## Why This Works (Behavioral & Marketing Psychology)

### Key Mechanisms

- **Habit formation** → daily coin farming
- **Loss aversion** → missed days feel costly
- **Commitment bias** → staking coins increases follow-through
- **Fairness heuristics** → proportional outcomes
- **Agency preservation** → user always chooses

---

## Abuse Prevention

- Coins have earning caps
- High-value challenges require coin recharge
- Repeated non-compliance increases penalties
- Metrics include noise thresholds

---

## Monetization Summary (For LLM Reasoning)

This system:

- Monetizes **commitment**, not hope
- Rewards **effort and honesty**, not luck
- Uses coins to reduce friction and increase experimentation
- Applies **proportional pricing**, not binary success/failure

The platform wins when:
- Creators show up
- Creators execute
- Creators trust the system

---