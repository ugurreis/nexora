# Billing (Creem, Faz A — provider-neutral thin adapter)

Product-local billing for Nexora. In-app subscription runs through a
provider-neutral boundary so it can later be lifted to a THE NOVA shared billing
service. **Classification: 🟡 Shared Foundation Impact.**

## Architecture

```
apps/web/src/pages/api/billing/{checkout,portal,webhook}.ts   <- HTTP, provider-agnostic
        │  depends only on:
        ▼
packages/api/src/billing/
  gateway.ts        getBillingGateway() -> BillingGateway     <- factory (BILLING_PROVIDER)
  types.ts          neutral types + errors + BillingGateway interface
  entitlement.ts    isEntitledStatus / workspacePlanForSubscription
  providers/creem/  config · signature · status · client · parse · adapter   <- ONLY Creem code
```

Nothing outside `providers/creem` imports a Creem SDK or a provider-shaped field.
Swapping providers = add another `BillingGateway` implementation + factory branch.

- **Checkout**: `POST /v1/checkouts` → `checkout_url`.
- **Portal**: `POST /v1/customers/billing` → `customer_portal_link`.
- **Webhook envelope**: `{ id, eventType, created_at, object }`.
- **Signature**: header `creem-signature`, HMAC-SHA256 hex over the raw body.

## Entitlement policy

- `workspace.plan` is granted only from a **verified** webhook with status
  `active`/`trialing`. Any other status (`canceled`, `expired`, `past_due`,
  `unpaid`, `incomplete`, `paused`) revokes to `free`. Failed payment (`past_due`)
  revokes immediately — no grace period in Faz A.
- planKey → workspace_plan mapping: `standard→team`, `premium→pro` (the enum
  rename is deferred; the neutral `planKey` is stored on the subscription row).
- **Success URL is never proof of entitlement** — access changes only via the
  signed webhook.
- **Idempotency + ordering**: the subscription row stores `lastEventId` and
  `lastEventAt`. Duplicate `eventId` → no-op; older `eventAt` → no-op; the upsert
  runs in a `FOR UPDATE` transaction so concurrent deliveries can't both apply.

## Environment variables

| Var | Required | Notes |
|-----|----------|-------|
| `BILLING_PROVIDER` | no | defaults to `creem` |
| `CREEM_API_KEY` | yes | server-only secret |
| `CREEM_WEBHOOK_SECRET` | yes | webhook signature secret (Developers > Webhooks) |
| `CREEM_API_BASE` | no | `https://api.creem.io` (prod) / `https://test-api.creem.io` (test) |
| `CREEM_PRODUCT_STANDARD_MONTHLY` | yes | product id `prod_...` (server config only) |
| `CREEM_PRODUCT_STANDARD_YEARLY` | yes | |
| `CREEM_PRODUCT_PREMIUM_MONTHLY` | yes | |
| `CREEM_PRODUCT_PREMIUM_YEARLY` | yes | |

Secrets (`CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`) live in Coolify, never in the repo.

## Local webhook testing

1. Set `CREEM_WEBHOOK_SECRET` + product ids in `app/.env`.
2. Build a signed request and POST it to the running app:
   ```bash
   SECRET="whsec_local"
   BODY='{"id":"evt_1","eventType":"subscription.active","created_at":1728734327355,"object":{"id":"sub_1","status":"active","customer":{"id":"cus_1"},"product":{"id":"'"$CREEM_PRODUCT_PREMIUM_YEARLY"'"},"metadata":{"workspacePublicId":"<ws>"}}}'
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
   curl -sS -X POST http://localhost:3000/api/billing/webhook \
     -H "Content-Type: application/json" -H "creem-signature: $SIG" --data "$BODY"
   ```
   Expect `200 {"received":true}`; a wrong/missing signature returns `401`.
3. For real Creem deliveries, expose localhost via a tunnel and register the URL
   in the Creem dashboard.

## Production secrets checklist (Coolify)

- [ ] `CREEM_API_KEY` (production key — `mode:prod`)
- [ ] `CREEM_WEBHOOK_SECRET`
- [ ] `CREEM_PRODUCT_STANDARD_MONTHLY|YEARLY`, `CREEM_PRODUCT_PREMIUM_MONTHLY|YEARLY`
- [ ] `NEXT_PUBLIC_BASE_URL` matches the production domain (used for the success URL)

## Operational steps still required before taking live payment

1. Register `https://<domain>/api/billing/webhook` in the Creem dashboard and
   copy its signing secret into `CREEM_WEBHOOK_SECRET`.
2. Set the four `CREEM_PRODUCT_*` ids (existing live products already exist).
3. Run a test-mode end-to-end checkout → webhook → confirm `subscription` row +
   `workspace.plan` update, then a low-value live smoke test.
4. Re-enable the landing purchase CTAs in `apps/web/public/nexora-landing.html`
   **only after** the above passes. Note: there is **no `BILLING_ENABLED` flag** —
   PR #11 disabled the CTAs by removing the live Creem checkout links and showing
   "Yakında"; re-enabling means restoring the checkout wiring (Creem link /
   app-onboarding), a separate approved code change.

## Release notes (Faz A)

- **Onboarding (new workspace, paid plan) behavior change**: the workspace is now
  created immediately (free), then checkout starts for it — previously the
  workspace was created only on Stripe `checkout.session.completed`. Abandoning
  checkout now leaves a usable free workspace instead of nothing.
- **Custom Pro workspace slug is no longer chosen during checkout**; set it in
  workspace settings after upgrading. (Was previously passed to Stripe and applied
  on checkout success.)
- **Failed payment (`past_due`) revokes paid access immediately** — no grace
  period in Faz A. Revisit if a grace window is desired.
- **Legacy Stripe HTTP routes now return `410 Gone`** (`/api/stripe/*`). In-app
  billing goes through `/api/billing/*`.

## Deferred (not in Faz A)

- Feature gating / seat-limit enforcement (Faz B) and credits (Faz C).
- Removing the legacy Stripe coupling: `@kan/stripe`, the `@better-auth/stripe`
  plugin in `packages/auth`, `trpc.ts` `listActiveSubscriptions`,
  `users.stripeCustomerId`, and the `subscription.stripe*` columns. These are
  kept for back-compat; the Stripe HTTP routes are already 410 Gone.
- Route-level HTTP tests for checkout/portal/webhook (auth + ownership + status
  codes). The security-critical logic is covered by unit + DB-integration tests;
  the HTTP wiring needs an apps/web integration harness that does not yet exist.
- Custom pro workspace slug during onboarding checkout (set in settings instead).

## Related billing documents (index)

This file is the canonical entry point for Nexora billing. Companion documents
live under `docs/`:

- [`docs/GO_LIVE_READINESS.md`](docs/GO_LIVE_READINESS.md) — release status +
  go-live verdict (🟡 Ready with Conditions).
- [`docs/GO_LIVE_EXECUTION_PLAN.md`](docs/GO_LIVE_EXECUTION_PLAN.md) — go-live day
  operational runbook (per-step: precondition · action · expected · on-failure · verify).
- [`docs/CREEM_GO_LIVE_CHECKLIST.md`](docs/CREEM_GO_LIVE_CHECKLIST.md) — go-live
  operations checklist with [M]/[K]/[B]/[O] tags.
- [`docs/STRIPE_RETIREMENT_PLAN.md`](docs/STRIPE_RETIREMENT_PLAN.md) — post-go-live
  Stripe removal sequence + rollback.
- [`docs/BILLING_PLATFORM_MIGRATION_BOUNDARY.md`](docs/BILLING_PLATFORM_MIGRATION_BOUNDARY.md) —
  Nexora ↔ THE NOVA platform migration boundary (platform-migratable, not platform-ready).
- [`docs/RELEASE_GOVERNANCE.md`](docs/RELEASE_GOVERNANCE.md) — permanent release
  standard for all future billing changes (Patch/Minor/Major + 10-dimension checklist).
