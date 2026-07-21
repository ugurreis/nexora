# Nexora Billing — Teknik Plan (Creem canonical)

> Durum: **Planlama dokümanı** (kod yok). Kaynak: PR #1 `feat/creem-billing-adapter-phase-a`
> incelemesi + `BILLING.md`. Terminoloji kanonu: bu iş **"legacy payment cleanup (Creem
> canonical)"**tir — *"Stripe → Creem migration"* İFADESİ KULLANILMAZ.

## 0. Kanon
- **Tek ödeme sağlayıcısı: Creem.** Stripe / Paddle / LemonSqueezy / başka sağlayıcı **önerilmez,
  planlanmaz, varsayılmaz**. Mevcut Stripe kodu yalnız *legacy teknik borç* olarak ele alınır.
- Billing abstraction **yalnız Creem'i hedefler** (bugün tek implementasyon), ama provider-neutral
  sınır korunur → ileride THE NOVA shared billing servisine kaldırılabilir.

## 1. PR #1 İncelemesi

### 1.1 Ne yapıyor `[Doğrulandı: BILLING.md + packages/api/src/billing/* + migration SQL]`
Provider-neutral, ürün-yerel (product-local) tam bir Creem billing Faz A implementasyonu:
- **HTTP (provider-agnostik):** `apps/web/src/pages/api/billing/{checkout,portal,webhook}.ts`.
- **Çekirdek:** `packages/api/src/billing/` — `gateway.ts` (factory, `BILLING_PROVIDER`), `types.ts`
  (neutral tipler + `BillingGateway` arayüzü), `entitlement.ts` (status→plan politikası).
- **Creem'e özgü (yalnız burada):** `providers/creem/` — config · signature · status · client ·
  parse · adapter (+ birim testleri).
- **DB:** `subscription` tablosuna additive kolonlar (`provider`, `providerCustomerId`,
  `providerSubscriptionId`, `providerProductId`, `planKey`, `billingPeriod`, `lastEventId`,
  `lastEventAt`) + `providerSubscriptionId` üzerinde partial unique index (migration
  `20260718200900`).
- **Legacy:** `api/stripe/*` route'ları **410 Gone**.
- **UI:** onboarding select-plan / workspace-details, settings BillingSettings, UpgradeToProConfirmation.

### 1.2 Ana akış kararları (uygulanmış) `[Doğrulandı: BILLING.md "Entitlement policy"]`
- Plan yalnız **doğrulanmış webhook** + status `active`/`trialing` ile verilir; diğer her status
  (`canceled`/`expired`/`past_due`/`unpaid`/`incomplete`/`paused`) → `free`.
- **Success URL asla erişim kanıtı değildir** — erişim yalnız imzalı webhook ile değişir.
- **Idempotency + sıralama:** `lastEventId` (duplicate → no-op), `lastEventAt` (eski olay → no-op),
  `FOR UPDATE` transaction (eşzamanlı teslimat yarışını engeller).
- planKey → workspace_plan: `standard→team`, `premium→pro` (enum rename ertelendi).

### 1.3 Neyi eksik bırakıyor (deferred) `[Doğrulandı: BILLING.md "Deferred"]`
- **Route-seviyesi HTTP testleri** (checkout/portal/webhook için auth + ownership + status kodu) —
  apps/web entegrasyon harness'ı henüz yok; güvenlik-kritik mantık birim + DB testleriyle örtülü.
- **Feature gating / seat-limit** (Faz B), **credits** (Faz C).
- **Legacy Stripe coupling'in kaldırılması** (`@kan/stripe`, `@better-auth/stripe` plugin,
  `trpc.ts listActiveSubscriptions`, `users.stripeCustomerId`, `subscription.stripe*` kolonları) —
  back-compat için tutuluyor, HTTP route'ları zaten 410.
- Onboarding checkout sırasında **custom pro workspace slug** (artık settings'te ayarlanıyor).

### 1.4 Güvenli merge edilebilir mi?
**Kod olarak evet** `[Doğrulandı: gh pr view #1 → MERGEABLE | CLEAN]` (#3–#8 sonrası çakışma yok);
migration **additive** (nullable kolonlar → mevcut satırları bozmaz); Stripe route'ları 410.

**Ancak merge ≠ deploy-safe.** Rahatsız edici gerçek — merge etmeden önce/ile netleşmesi gerekenler:
1. **Migration çalıştırılmalı** (merge onu çalıştırmaz). Kod yeni kolonları bekler; migration'sız
   deploy → runtime hatası. Deploy sırası: **migrate image önce** (compose `migrate` servisi zaten
   `depends_on` ile web'den önce çalışır).
2. **4× `CREEM_PRODUCT_*` + `CREEM_API_KEY` + `CREEM_WEBHOOK_SECRET`** Coolify'da ayarlanmalı (yoksa
   checkout/webhook 5xx/401).
3. **Davranış değişiklikleri kabul edilmeli** (§1.5).
4. Route-seviyesi HTTP testlerinin yokluğu bilinçli kabul edilmeli (birim/DB testleri var).

→ Öneri: **PR #1 merge edilebilir, ama "deploy-ready" değil**; landing satın-alma CTA'ları
(`BILLING_ENABLED`) yalnız test-mode uçtan-uca akış + canlı smoke test geçtikten sonra açılmalı.
(Bu doküman PR #1'i merge/güncelleme ETMEZ.)

### 1.5 Davranış değişiklikleri (ürün kararı) `[Doğrulandı: BILLING.md "Release notes"]`
- Onboarding: paralı planda workspace **hemen (free) oluşturulur**, sonra checkout başlar (eskiden
  yalnız Stripe `checkout.session.completed`'da). Checkout terk → kullanılabilir free workspace kalır.
- **`past_due` paralı erişimi ANINDA iptal eder** — Faz A'da grace period yok (istenirse Faz B'de).
- Custom pro slug checkout'ta değil, settings'te.

## 2. Akış Tasarımları

### 2.1 Checkout
`POST /api/billing/checkout` → gateway → Creem `POST /v1/checkouts` → `checkout_url` → redirect.
`metadata.workspacePublicId` ile atıf (webhook geri okur). Auth + workspace ownership zorunlu
(route-testi eksik → Faz B'de eklenecek).

### 2.2 Webhook
`POST /api/billing/webhook`. Envelope `{ id, eventType, created_at, object }`. İmza:
`creem-signature` = HMAC-SHA256 hex (ham gövde). Doğrulanmazsa **401**. Doğrulanırsa parse →
status eşle → entitlement upsert (idempotent, FOR UPDATE) → `200 {received:true}`.

### 2.3 Subscription lifecycle
`subscription.active/trialing` → plan ver. `subscription.canceled/expired/paused/past_due/unpaid/
incomplete` → `free`. `providerSubscriptionId` unique → tek satır; `lastEventAt` ile out-of-order
koruması.

### 2.4 Entitlement
Kaynak-of-truth: imzalı webhook + DB `subscription` satırı. `workspace.plan` yalnız buradan türer.
`isEntitledStatus` / `workspacePlanForSubscription` (packages/api entitlement.ts).

### 2.5 Cancellation
Kullanıcı Creem customer portal'dan (`POST /v1/customers/billing` → `customer_portal_link`) iptal
eder → Creem `subscription.canceled` webhook'u → erişim `free`'ye döner. (Portal-based; uygulama-içi
iptal formu Faz A'da yok.)

### 2.6 Failed payment
`past_due` → **anında** `free` (Faz A). Faz B kararı: grace window (ör. period sonuna kadar erişim +
uyarı) eklenip eklenmeyeceği.

### 2.7 Idempotency
`lastEventId` (aynı eventId → no-op), `lastEventAt` (daha eski eventAt → no-op), `FOR UPDATE`
transaction. Duplicate/retry/out-of-order Creem teslimatlarına dayanıklı.

## 3. Nexora'ya özgü webhook / signing secret
- Nexora'nın **kendi Creem hesabı/ürünleri + kendi `CREEM_WEBHOOK_SECRET` + `CREEM_API_KEY`**'i
  olmalı (QRMate/POST-BASE'den AYRI). Her ürün = kendi webhook endpoint'i + kendi imza secret'i.
- Nexora webhook URL'si: `https://<nexora-domain>/api/billing/webhook` → Creem Dashboard →
  Developers → Webhooks'ta kayıt + secret kopyalanır.
- 4 ürün ID'si Nexora'nın Creem hesabındaki gerçek ürünlere karşılık gelmeli (`STANDARD`/`PREMIUM` ×
  `MONTHLY`/`YEARLY`).

## 4. Shared platform vs product-owned sınırı
`BILLING.md`: sınıflandırma **🟡 Shared Foundation Impact** `[Doğrulandı: BILLING.md]`.

| Katman | Sahiplik | İçerik |
|--------|----------|--------|
| **Product-owned (Nexora)** | Nexora | HTTP endpoint'leri (`api/billing/*`), `workspace.plan` eşlemesi (standard→team, premium→pro), subscription schema/repo, onboarding/settings UI, Nexora Creem hesabı + secret'ları |
| **Shared-liftable (THE NOVA, gelecek)** | Bugün ürün-yerel; ileride shared | provider-neutral `BillingGateway` arayüzü + Creem adapter — ileride THE NOVA shared billing servisine taşınabilir |

Kural: `providers/creem` dışında hiçbir yer Creem SDK / provider-shaped alan import etmez → sağlayıcı
değişimi = yeni `BillingGateway` impl + factory branch (bugün gerek yok, Creem canonical).

## 5. Legacy payment cleanup (Creem canonical)
> Terminoloji: bu bir **cleanup**tir, migration değil. Stripe = emekliye ayrılan legacy.

Kaldırılacaklar (ayrı, dikkatli PR'lar; her biri tek sorumluluk):
1. `@kan/stripe` paketi + `@better-auth/stripe` plugin (`packages/auth`).
2. `trpc.ts listActiveSubscriptions` (Stripe'a bağlı).
3. `users.stripeCustomerId` + `subscription.stripe*` kolonları (additive DROP migration).
4. `api/stripe/*` 410 route'ları (Creem canonical yerleştikten sonra).
Ön koşul: Creem canlı + doğrulanmış (test-mode uçtan-uca + smoke test). Cleanup **go-live sonrası**.

## 6. Riskler & rollback
- **Migration/deploy sırası**: migrate önce, web sonra (compose `depends_on` var). Rollback: additive
  kolonlar zararsız kalır; kod rollback'i (önceki image) kolonları görmezden gelir.
- **Secret eksikliği**: checkout/webhook fail-closed (401/5xx) — canlı ödeme almadan önce §3 tamamlanmalı.
- **`BILLING_ENABLED` CTA'ları**: doğrulanana kadar KAPALI tut (yanlışlıkla canlı ödeme riski).
- **Route-testi boşluğu**: auth/ownership HTTP testleri yok → Faz B öncesi manuel doğrulama şart.

## 7. Önerilen uygulama sırası
1. **PR #1 gözden geçir → merge** (kod-safe; deploy DEĞİL). *(bu doküman merge etmez)*
2. Nexora Creem hesabı + 4 ürün + webhook secret hazırla (§3).
3. Migration'ı staging'de çalıştır → test-mode uçtan-uca (checkout→webhook→plan) doğrula.
4. Canlı düşük-tutarlı smoke test → `BILLING_ENABLED` CTA'larını aç.
5. **Faz B**: route-seviyesi HTTP testleri + feature gating / seat-limit (+ grace window kararı).
6. **Faz C**: credits.
7. **Legacy payment cleanup** (§5) — go-live sonrası, ayrı PR'lar.
