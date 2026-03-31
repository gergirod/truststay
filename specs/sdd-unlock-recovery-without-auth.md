# SDD Unlock Recovery Without Auth

## Objective
Allow paying users to recover unlocked destinations across devices using only their purchase email, without creating full account/auth flows.

## User
Remote worker who already paid on one device and needs access again on another browser/device.

## Jobs To Be Done
- Recover purchased unlocks quickly on a new device.
- Prove email ownership without account/password friction.
- Keep current cookie-based unlock UX while adding durable server-side recovery.

## Non-goals
- Full user accounts, profiles, or password auth.
- Subscription billing or entitlement revocation UI.
- Backfilling historical Stripe sessions before rollout.

## Scope
1. Persist unlock entitlements server-side from Stripe sessions.
2. Add one-time magic-link restore flow.
3. Rehydrate unlock cookies from durable entitlements.

## Functional Requirements

### FR1: Durable unlock persistence
- Every paid checkout session stores an entitlement row keyed by Stripe session ID.
- Entitlement includes normalized email and purchased scope (`city_pass` or `city_bundle`).
- Persistence is idempotent across finalize + webhook execution.

### FR2: Restore request (no auth, email verification)
- User submits email to request restore link.
- System only returns generic success to prevent account enumeration.
- If entitlements exist, system issues one-time token and sends restore email.

### FR3: One-time restore confirm
- Token is single-use and short-lived (20 minutes).
- On valid token, server restores unlock cookies from DB entitlements.
- On invalid/expired token, user sees a recoverable error state.

### FR4: Device migration UX
- Locked city page exposes a lightweight "Restore unlocks" card.
- User can recover unlocks without leaving destination flow.

### FR5: Unlock confirmation email
- On first successful entitlement insert for a Stripe session, send confirmation email.
- Email must include unlocked scope and plain recovery instructions for new device/browser.
- Duplicate finalize/webhook processing must not send duplicate emails.

## Data Model

### `unlock_entitlements`
- `email`, `email_normalized`
- `product`, `city_slug`, `bundle_city_slug`
- `stripe_session_id` (unique), optional Stripe customer/payment IDs
- `purchased_at`, `created_at`

### `unlock_restore_tokens`
- `email_normalized`
- `token_hash` (unique)
- `expires_at`, `used_at`, `created_at`

## UX States (Required)
- Locked user sees restore form.
- Restore request accepted (email sent or generic success).
- Restore success (`restored=1`) with count.
- Restore invalid/expired (`restore=invalid`).
- Restore empty (`restore=empty`).

## Acceptance Criteria

### AC1: Entitlement persistence
- Given a paid checkout
- When finalize and/or webhook runs
- Then a durable entitlement row exists for that email and purchase scope.

### AC2: Cross-device restore success
- Given user paid on Device A
- When user requests restore on Device B and clicks magic link
- Then unlock cookies are set on Device B and locked sections become accessible.

### AC3: Token security
- Given a restore token was already consumed or expired
- When opened again
- Then restore fails safely and no cookies are granted.

### AC4: No email enumeration
- Given arbitrary emails are submitted to restore request
- When API responds
- Then response shape does not reveal whether purchases exist.

### AC5: Unlock confirmation message
- Given a paid checkout session with customer email
- When entitlement is first persisted
- Then user receives one unlock confirmation email with restore instructions.

## Telemetry Requirements
- `unlock_restore_requested`
- `unlock_restore_email_sent`
- `unlock_restore_completed`
- `unlock_restore_failed`
- `unlock_confirmation_email_sent`

## Implementation Mapping
- `src/db/schema.ts`
- `drizzle/0001_awesome_snowbird.sql`
- `src/lib/unlockEntitlements.ts`
- `src/app/api/checkout/finalize/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/unlocks/restore/request/route.ts`
- `src/app/api/unlocks/restore/confirm/route.ts`
- `src/components/RestoreUnlocksCard.tsx`
- `src/app/city/[slug]/page.tsx`
