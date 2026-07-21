# Runbook — Nexora Billing Deploy (Creem canonical)

> **Amaç:** Nexora Creem billing'i güvenli canlıya alma prosedürü. **Bu runbook deploy ETMEZ** —
> operatör (insan) uygular. Kaynak: PR #1 kod incelemesi + `BILLING.md`. Terminoloji: Creem canonical;
> Stripe = 410 legacy.

## 0. Ön koşullar
- PR #1 (`feat/creem-billing-adapter-phase-a`) main'e merge edilmiş olmalı (kod-safe
  `[Doğrulandı: gh pr view #1 MERGEABLE/CLEAN]` — ama deploy ≠ merge).
- Nexora'nın **kendi** Creem hesabı + 4 ürün (STANDARD/PREMIUM × MONTHLY/YEARLY).
- Coolify erişimi (image = build-from-source; bkz DEPLOY notları).

## 1. Migration sırası
Migration **additive** `[Doğrulandı: 20260718200900 SQL — ALTER ADD COLUMN nullable + partial unique index]`:
`subscription` tablosuna `provider, providerCustomerId, providerSubscriptionId, providerProductId,
planKey, billingPeriod, lastEventId, lastEventAt` + `providerSubscriptionId` partial unique index.
- **Mevcut satırları bozmaz** (hepsi nullable).
- Deploy topolojisinde `migrate` servisi web'den ÖNCE çalışır (`depends_on:
  service_completed_successfully`) `[Doğrulandı: docker-compose.yml:132-134]`.
- **Sıra:** (1) migrate image çalışır → şema güncellenir → (2) web/worker başlar.
- **Migration'sız web deploy = runtime hatası** (kod yeni kolonları bekler).

## 2. Deploy sırası
1. `postgres` sağlıklı (healthcheck).
2. `migrate` servisi (additive migration) → tamamlanmasını bekle.
3. `web` (+ opsiyonel `inbox-worker`, `telegram-bot`) başlar.
> Coolify **build-from-source** ile deploy eder (`inbox-worker`/`telegram-bot` registry imajı yok).
> Image ref'leri `ghcr.io/ugurreis/nexora*` `[Doğrulandı: docker-compose.yml #8 merge sonrası]`.

## 3. Gerekli ENV (billing)
| Var | Zorunlu | Not |
|-----|---------|-----|
| `BILLING_PROVIDER` | hayır | default `creem` (gateway default→throw) |
| `CREEM_API_KEY` | **evet** | server-only secret |
| `CREEM_WEBHOOK_SECRET` | **evet** | webhook imza secret'i (Creem Dashboard) |
| `CREEM_API_BASE` | hayır | prod `https://api.creem.io` / test `https://test-api.creem.io` |
| `CREEM_PRODUCT_STANDARD_MONTHLY` | **evet** | `prod_...` |
| `CREEM_PRODUCT_STANDARD_YEARLY` | **evet** | |
| `CREEM_PRODUCT_PREMIUM_MONTHLY` | **evet** | |
| `CREEM_PRODUCT_PREMIUM_YEARLY` | **evet** | |
| `NEXT_PUBLIC_BASE_URL` | **evet** | success URL + prod domain eşleşmeli |

Ayrıca genel deploy env'i (bkz `docs/runbooks` / compose): `BETTER_AUTH_SECRET`, `POSTGRES_URL`,
`POSTGRES_PASSWORD`, `SERVICE_FQDN_WEB_3000`.

## 4. Gerekli secret (Coolify secret manager — repoya KOYULMAZ)
- [ ] `CREEM_API_KEY` (production, `mode:prod`)
- [ ] `CREEM_WEBHOOK_SECRET` (Creem Dashboard → Developers → Webhooks'tan)
- [ ] `BETTER_AUTH_SECRET`, `POSTGRES_URL`, `POSTGRES_PASSWORD`
> Secret'lar **asla** commit/log/echo edilmez. Bu runbook gerçek değer İÇERMEZ.

## 5. Webhook kaydı
1. Creem Dashboard → Developers → Webhooks → URL: `https://<nexora-domain>/api/billing/webhook`.
2. Signing secret'i kopyala → `CREEM_WEBHOOK_SECRET`.
3. Abone olunacak event'ler: `subscription.*` (active/trialing/canceled/expired/past_due/unpaid/
   paused), `checkout.completed`, iade/dispute (varsa).
> İmza header'ı `creem-signature` = HMAC-SHA256 hex (ham gövde) `[Doğrulandı: providers/creem/signature.ts]`.

## 6. Smoke test (test-mode önce)
Bkz `docs/testing/BILLING_TEST_CHECKLIST.md`. Özet: test-mode uçtan-uca checkout→webhook→plan;
imza-401 negatifi; idempotency (aynı event 2×); sonra **düşük tutarlı canlı** smoke.

## 7. CTA açma (SON adım)
`apps/web/public/nexora-landing.html` içindeki `BILLING_ENABLED` satın-alma CTA'ları **yalnız** §6
geçtikten sonra açılır. Aksi halde yanlışlıkla canlı ödeme riski.

## 8. Rollback
- **Kod rollback:** önceki image/commit'e dön. Additive kolonlar zararsız kalır (eski kod onları
  görmezden gelir) → **migration geri alınması gerekmez.**
- **Config rollback:** compose değişikliği `git revert`.
- **Billing devre dışı:** `BILLING_ENABLED` CTA'larını kapat + gerekirse `CREEM_*` env'i kaldır
  (checkout/webhook fail-closed olur: checkout 5xx, webhook 401/no-op). Mevcut abonelikler DB'de kalır.
- **Yanlış entitlement:** webhook idempotent + status-driven; doğru event yeniden gönderilirse
  düzelir. Manuel düzeltme: `subscription` satırı + `workspace.plan` (dikkatli, denetlenerek).

## 9. Monitoring
- **Log:** `createLogger("api")` — webhook `applied`/`skipped (idempotent)`/`no-op`/`parse failed`/
  `processing failed` (500) `[Doğrulandı: webhook.ts log çağrıları]`. Bunları izle.
- **Alarm önerileri:** webhook 401 artışı (imza/secret sorunu), 500 artışı (DB/transient),
  `no-op: unknown workspace` (metadata/atıf sorunu).
- **İş metriği:** başarılı `applied` başına plan geçişleri; `past_due`→free oranı (ödeme başarısızlığı).
- Sentry opsiyonel (`SENTRY_DSN` varsa).

## 10. Production checklist
- [ ] PR #1 merge (kod-safe).
- [ ] Migration staging'de çalıştı, `subscription` kolonları mevcut.
- [ ] 4× `CREEM_PRODUCT_*` + `CREEM_API_KEY` + `CREEM_WEBHOOK_SECRET` + `NEXT_PUBLIC_BASE_URL` set.
- [ ] Webhook URL Creem Dashboard'da kayıtlı + secret eşleşiyor.
- [ ] Test-mode uçtan-uca geçti (checkout→webhook→plan; imza-401; idempotency).
- [ ] Düşük-tutarlı canlı smoke geçti.
- [ ] `BILLING_ENABLED` CTA'ları açıldı.
- [ ] Log/alarm izleme aktif.
- [ ] Rollback prosedürü (§8) operatörce biliniyor.
