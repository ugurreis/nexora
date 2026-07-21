# Test Checklist — Nexora Billing (Creem)

> **Amaç:** Canlı ödeme almadan önce billing'i doğrulama listesi. Kaynak: PR #1 kod incelemesi.
> Bu checklist **test yürütmez** — operatör uygular. Gerçek secret İÇERMEZ.

## A. Otomatik testler (mevcut) `[Doğrulandı: PR #1 dosya listesi]`
Bunlar CI/yerelde çalıştırılabilir (kod değişikliği yok):
- [ ] `packages/api/src/billing/providers/creem/signature.test.ts` — HMAC-SHA256 imza.
- [ ] `…/creem/parse.test.ts` — event parse.
- [ ] `…/creem/status.test.ts` — status → entitlement.
- [ ] `…/creem/config.test.ts` — env/product çözümleme.
- [ ] `…/creem/client.test.ts` — Creem HTTP client.
- [ ] `packages/api/src/billing/entitlement.test.ts` — plan politikası.
- [ ] `packages/db/src/repository/subscription.repo.test.ts` — idempotency/upsert.
> **Boşluk:** route-seviyesi HTTP testleri (checkout/portal/webhook için auth+ownership+status kodu)
> **YOK** (apps/web entegrasyon harness'ı yok). Güvenlik MANTIĞI kodlanmış ama HTTP katmanında
> otomatik-test edilmemiş `[Doğrulandı: checkout.ts auth+IDOR var; BILLING.md "Deferred"]` → manuel
> doğrulama (§C) şart.

## B. Webhook imza & idempotency (yerel, imzalı istekle)
`[Doğrulandı: webhook.ts + subscription.repo.ts]`
- [ ] **Geçerli imza + `subscription.active`** → `200 {received:true}`, `subscription` satırı +
  `workspace.plan` güncellenir.
- [ ] **Yanlış/eksik imza** → **401**, DB yazması YOK (imza parse/DB'den önce doğrulanır).
- [ ] **Bozuk JSON (geçerli imza)** → **400**.
- [ ] **Aynı `eventId` 2×** → ikincisi `skipped (idempotent, duplicate)`, `workspace.plan` değişmez.
- [ ] **Eski `eventAt` (out-of-order)** → `skipped (stale)`, newer state korunur.
- [ ] **Eşzamanlı 2 teslimat** → `FOR UPDATE` ile serileşir; çift uygulama yok.
- [ ] **`checkout.completed` / workspace metadata'sız event** → `200` no-op (retry storm yok).
- [ ] **Bilinmeyen workspace** → `200` no-op (ack).

Örnek imzalı istek (BILLING.md'den; `whsec_local` = yerel test secret'i, gerçek değil):
```bash
SECRET="whsec_local"
BODY='{"id":"evt_1","eventType":"subscription.active","created_at":1728734327355,"object":{"id":"sub_1","status":"active","customer":{"id":"cus_1"},"product":{"id":"'"$CREEM_PRODUCT_PREMIUM_YEARLY"'"},"metadata":{"workspacePublicId":"<ws>"}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
curl -sS -X POST http://localhost:3000/api/billing/webhook \
  -H "Content-Type: application/json" -H "creem-signature: $SIG" --data "$BODY"
# Beklenen: 200 {"received":true}; yanlış imza → 401
```

## C. Checkout & yetkilendirme (manuel — route testi olmadığı için) `[Doğrulandı: checkout.ts]`
- [ ] **Auth'suz** `POST /api/billing/checkout` → **401**.
- [ ] **Yetkisiz workspace** (manage yetkisi yok) → **403** (IDOR guard `assertPermission
  workspace:manage`).
- [ ] **Bilinmeyen workspace** → **404**.
- [ ] **Geçersiz gövde** (plan/period enum dışı) → **400**.
- [ ] **Geçerli** → `checkout_url` döner; client fiyat/product **güvenilmez** (server-side çözülür).
- [ ] Portal: `POST /api/billing/portal` auth'lu → `customer_portal_link`.

## D. Entitlement & lifecycle (test-mode uçtan-uca) `[Doğrulandı: entitlement.ts]`
- [ ] `active`/`trialing` webhook → `workspace.plan` = team/pro (planKey eşlemesi).
- [ ] `canceled` → `free` (Creem portal'dan iptal → webhook).
- [ ] `past_due` → **anında `free`** (Faz A grace yok = **failed payment**).
- [ ] `expired`/`unpaid`/`paused`/`incomplete` → `free`.
- [ ] **Success URL erişim kanıtı DEĞİL** — plan yalnız imzalı webhook'la değişir.

## E. Provider tekilliği `[Doğrulandı: gateway.ts]`
- [ ] `BILLING_PROVIDER` unset → `creem` (default).
- [ ] Bilinmeyen `BILLING_PROVIDER` → gateway **throw** (Stripe/Paddle/LS bağlı DEĞİL).
- [ ] Legacy `/api/stripe/*` (checkout/portal/webhook) → **410 Gone** (fail-closed).

## F. Canlı smoke (test-mode geçtikten sonra)
- [ ] Düşük-tutarlı **canlı** checkout → gerçek Creem webhook → `subscription` + `workspace.plan`.
- [ ] Canlı iptal → `free`.
- [ ] İzleme: webhook log'ları (`applied`/`skipped`), 401/500 alarmı yok.

## G. Go/No-Go
**GO** yalnızca: A yeşil · B tüm negatif+pozitif · C tüm auth/IDOR · D tüm lifecycle · E provider
tekil · F canlı smoke — hepsi geçerse. Aksi halde **No-Go**; `BILLING_ENABLED` CTA'ları KAPALI kalır.
