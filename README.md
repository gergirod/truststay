# Trustay MVP Cursor Pack

This pack is the source of truth for building **Trustay Phase 1 MVP** with a Cursor agent.

## Goal
Build a **small, revenue-first web MVP** that helps a remote worker choose the best area in a city to:
- work with focus
- find backup cafés / coworkings
- train nearby
- eat well without wasting time
- reduce setup friction during the first 7–30 days in a new place

## What this pack is for
This pack is intentionally scoped to **MVP only**.
It does **not** include later-stage growth loops, community features, marketplace logic, or investor-style roadmap expansion.

## Product sentence
**Trustay helps remote workers land in a new city and get their routine set up fast.**

## Core principle
Trustay must not claim certainty without evidence.
The product should use **signals + confidence levels** instead of hard claims when data is incomplete.

## Source of truth order for Cursor
1. `.cursor/rules/*`
2. `specs/product-spec.md`
3. `specs/mvp-spec.md`
4. `specs/place-confidence-system.md`
5. `specs/technical-spec.md`
6. `specs/api-spec.md`
7. `specs/ui-spec.md`
8. `specs/acceptance-criteria.md`
9. `tasks/*`

## Recommended repo structure
```txt
trustay/
  .cursor/
    rules/
  specs/
  tasks/
  prompts/
  decisions/
  src/
  public/
  package.json
```

## How to use with Cursor
1. Copy this pack into the root of your Next.js repo.
2. Open the repo in Cursor.
3. Paste `prompts/00-read-specs-first.md`.
4. Review Cursor's summary.
5. Paste `prompts/01-task-01-only.md`.
6. Test locally.
7. Commit.
8. Move to the next task only after validation.

## Out of scope for this pack
- growth strategy
- launch plan
- SEO expansion plan
- native mobile app
- full booking engine
- large user review system
- social/community layer
