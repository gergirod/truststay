# Task 21 — CANCELLED

**Superseded by Task 20.**

The runtime LLM approach (calling the AI on every user request) was replaced by
an admin-driven CMS approach in Task 20.

Reasoning:
- OSM place data is stable enough to pre-generate narratives from admin
- Admin-generated content has higher quality (human review before publish)
- No per-user API cost or latency
- The admin tool in Task 20 fetchs real Overpass data before calling the LLM,
  so the LLM still has access to actual place data — the same benefit Task 21 proposed

See Task 20 for the full implementation.
