# Task 29 - SDD Unlock Recovery Without Auth

## Owner
- Primary: TBD
- Reviewer: TBD

## Status
- [ ] Not started
- [x] In progress
- [ ] In review
- [ ] Done

## Purpose
Enable cross-device unlock recovery using purchase email verification, while keeping current cookie-based unlock experience and avoiding full auth complexity.

## Spec Reference
- `specs/sdd-unlock-recovery-without-auth.md`

## Workstreams

### W1 - Entitlement Persistence
- Add durable unlock entitlement schema.
- Persist on Stripe checkout success (finalize + webhook idempotency).

### W2 - Restore Token Flow
- Add one-time restore token schema and service.
- Implement request + confirm API routes.

### W3 - City UX Integration
- Add restore card on locked city experience.
- Surface success/failure states from restore query params.

### W4 - Rollout Safety
- Keep generic response for restore request to avoid email enumeration.
- Add operational notes for required env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

### W5 - Unlock Confirmation Email
- Send a transactional unlock confirmation email after first entitlement persistence.
- Include clear cross-device recovery instructions and restore entry guidance.

## Acceptance Gate
- AC1, AC2, AC3, AC4 from `specs/sdd-unlock-recovery-without-auth.md` validated before marking done.

## Deliverables
- Migration + schema update.
- Entitlement + restore APIs.
- Locked-city restore UI.
- Validation notes with end-to-end restore test.
