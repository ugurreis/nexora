# Creem Go-Live Operations Checklist (Phase A)

> Salt operasyonel checklist — kod değişikliği içermez. İşaretler:
> **[M]** Manuel işlem · **[K]** Kod gerektiren işlem · **[B]** Bloklayıcı · **[O]** Opsiyonel.

## Bağımlılık zinciri (özet)

```
deploy (kod + additive migration)
  -> Coolify env + CREEM_WEBHOOK_SECRET
    -> Creem dashboard webhook kaydı
      -> checkout / webhook / failed-payment testleri
        -> go-live doğrulama
          -> (EN SON, ayrı onay) landing CTA açma (BILLING_ENABLED = true)
```

İlk bloklayıcı: bu PR prod'a deploy edilmeden `/api/billing/webhook` endpoint'i ve
neutral `subscription` kolonları prod'da **yoktur**. Aşağıdaki tüm adımlar deploy'a bağlıdır.

> Doğrulanmış sabitler (repo dosyaları + docs.creem.io, 2026-07-18/19): domain
> `nexora.nexovias.com`; webhook path `/api/billing/webhook`; imza header
> `creem-signature` (HMAC-SHA256 hex, raw body); success URL
> `${NEXT_PUBLIC_BASE_URL}/settings?billing=success`; Coolify app uuid
> `yjlhqzqktb12xpnk9qf8ja2r`.

---

## 0. Ön koşul — kod prod'da olmalı
- [ ] **[K][B]** PR #1 onayı sonrası `feat/creem-billing-adapter-phase-a` → Coolify'ın izlediği deploy branch'e alınır ve deploy edilir. Deploy'da migrate container additive migration'ı (`20260718200900`) uygular. Bu olmadan aşağıdaki hiçbir adım çalışmaz.
- [ ] **[M][B]** Deploy sonrası `GET https://nexora.nexovias.com/api/billing/webhook` → **405** (Method not allowed) döndüğünü doğrula (endpoint canlı). 404 = deploy/routing sorunu.

## 1. Production webhook URL
- [ ] **[M][B]** Kullanılacak URL: `https://nexora.nexovias.com/api/billing/webhook`.

## 2. Creem dashboard webhook kaydı
- [ ] **[M][B]** Creem dashboard → Developers → Webhooks → yukarıdaki URL'i **production (mode:prod)** olarak kaydet.
- [ ] **[M][B]** Abone olunacak event'ler: `subscription.active`, `subscription.paid`, `subscription.trialing`, `subscription.update`, `subscription.scheduled_cancel`, `subscription.paused`, `subscription.past_due`, `subscription.canceled`, `subscription.expired`, `refund.created`, `dispute.created`.
- [ ] **[M][O]** `checkout.completed` seçilse de kod bunu no-op olarak geçer (zararsız).

## 3. `CREEM_WEBHOOK_SECRET`
- [ ] **[M][B]** Webhook kaydı sonrası Creem'in ürettiği **signing secret**'i kopyala.
- [ ] **[M][B]** Coolify'da `CREEM_WEBHOOK_SECRET` olarak **secret** şeklinde gir (repo'ya YAZMA). Eksikse webhook her isteği 401 reddeder.

## 4. 4 adet `CREEM_PRODUCT_*` değeri
Mevcut canlı ürün ID'leri (landing config + Creem API, `mode:prod, status:active`):
- [ ] **[M][B]** `CREEM_PRODUCT_STANDARD_MONTHLY = prod_5EgV8S8rAQ0iprEFUXsnfS`
- [ ] **[M][B]** `CREEM_PRODUCT_STANDARD_YEARLY  = prod_3BXDShfWhwzCEtrFUVvcFb`
- [ ] **[M][B]** `CREEM_PRODUCT_PREMIUM_MONTHLY  = prod_351g0O7RRGz6WrxTmP4fxM`
- [ ] **[M][B]** `CREEM_PRODUCT_PREMIUM_YEARLY   = prod_48NrhOFXv5QBb6FyXSW7G9`
- [ ] **[M][O]** Fiyat/period eşleşmesini Creem dashboard'da bir kez daha teyit et (yanlış eşleme = yanlış plan satılır).

## 5. Coolify environment değişkenleri
- [ ] **[M][B]** `CREEM_API_KEY` (production key, secret) — prod'da set mi doğrula.
- [ ] **[M][B]** `CREEM_WEBHOOK_SECRET` (bkz. §3)
- [ ] **[M][B]** 4× `CREEM_PRODUCT_*` (bkz. §4)
- [ ] **[M][O]** `CREEM_API_BASE` — set etme (kod default `https://api.creem.io`); yalnız test modunda `https://test-api.creem.io`.
- [ ] **[M][O]** `BILLING_PROVIDER` — set etme (default `creem`).
- [ ] **[M][B]** `NEXT_PUBLIC_BASE_URL = https://nexora.nexovias.com` doğru (success URL bundan üretilir).
- [ ] **[M][B]** Env değişimi sonrası **restart/redeploy** (env aksi halde container'a yansımaz). Not: env-only redeploy geçmişte Traefik routing drift'ine yol açtı — deploy sonrası site 200 kontrolü şart (bkz. `docs/backlog/2026-07-15-traefik-routing-failure-after-redeploy.md`).

## 6. Checkout test senaryoları
- [ ] **[M][B]** Giriş yapmış kullanıcı + yönetebildiği workspace ile `/settings` → upgrade → checkout başlat → Creem hosted sayfası açılıyor mu.
- [ ] **[M][B]** Düşük tutarlı **gerçek** ödeme tamamla → Creem success → `/settings?billing=success`'e dönüş.
- [ ] **[M][O]** Yetki testi: başka kullanıcının workspace publicId'siyle `POST /api/billing/checkout` → **403** beklenir (IDOR guard). Manuel curl; kod değişikliği değil.
- [ ] **[M][O]** Onboarding yeni-workspace paid akışı: workspace önce yaratılır, sonra checkout (release note davranışı).

## 7. Webhook test senaryoları
- [ ] **[M][B]** §6'daki ödeme sonrası Creem'in `subscription.active`/`paid` webhook'u geldi mi (Creem dashboard delivery log).
- [ ] **[M][B]** DB'de `subscription` satırı oluştu mu: `provider='creem'`, `providerSubscriptionId`, `planKey`, `status='active'`, `lastEventId` dolu; ve ilgili `workspace.plan` `team`/`pro` oldu mu.
- [ ] **[M][B]** Geçersiz imza testi: yanlış `creem-signature` ile POST → **401**, DB değişmez.
- [ ] **[M][O]** Idempotency: aynı event'i tekrar tetikle (Creem "resend") → ikinci kez entitlement değişmez, `workspace.plan` bozulmaz.

## 8. Başarısız ödeme / `past_due` kontrolü
- [ ] **[M][B]** Yenileme başarısızlığını tetikle (test kartı) → `subscription.past_due` → **erişim anında `free`'ye düşer** (Faz A'da grace yok).
- [ ] **[M][B]** `subscription.canceled`/`expired` → `workspace.plan='free'`, kullanıcı ücretli özelliği kaybediyor.
- [ ] **[M][O]** İş kararı: `past_due`'da anında kesme kabul mü, yoksa grace penceresi mi? (Faz A davranışı bilinçli sert; değişecekse ayrı iş.)

## 9. Rollback adımları
- [ ] **[K/M][B]** Uygulama seviyesi: Coolify'da bir önceki image'e/commit'e redeploy (billing öncesi sürüm). App-içi ödeme yolu eski haline döner.
- [ ] **[M][B]** Landing zaten `BILLING_ENABLED=false` (kapalı) — sorun olursa CTA açma adımını (§11) uygulama; kullanıcıdan para alınmaz.
- [ ] **[M][O]** DB rollback (yalnız zorunlu ve tablo bu işten boşsa) — additive migration geri alınabilir, veri yeniden yazılmaz:
  ```sql
  DROP INDEX IF EXISTS "subscription_provider_subscription_id_idx";
  ALTER TABLE "subscription"
    DROP COLUMN "provider", DROP COLUMN "providerCustomerId",
    DROP COLUMN "providerSubscriptionId", DROP COLUMN "providerProductId",
    DROP COLUMN "planKey", DROP COLUMN "billingPeriod",
    DROP COLUMN "lastEventId", DROP COLUMN "lastEventAt";
  ```
  Not: eski `stripe*` kolonları korunduğu için better-auth/partner rollback'te etkilenmez. Genelde kolonları bırakmak (yalnız kodu geri almak) daha güvenli — DROP yalnız gerçekten gerekirse.
- [ ] **[M][B]** Creem tarafı: sorun para akışındaysa Creem dashboard'dan webhook'u geçici devre dışı bırak / ürünleri pasifle.

## 10. Go-live sonrası doğrulama
- [ ] **[M][B]** `https://nexora.nexovias.com` **200** (Traefik drift kontrolü — deploy sonrası).
- [ ] **[M][B]** Uçtan uca 1 gerçek düşük-tutarlı abonelik: checkout → webhook → `subscription` satırı + `workspace.plan` + kullanıcı ücretli özelliğe erişiyor.
- [ ] **[M][B]** Portal: `/settings` → Billing portal → Creem `customer_portal_link` açılıyor, yalnız kendi kaydına erişim.
- [ ] **[M][B]** 1 iptal/failed senaryosu ile erişimin geri çekildiği canlıda görüldü.
- [ ] **[M][O]** Log/monitoring: webhook 401/500 oranı, checkout 502 oranı izleniyor.

## 11. Landing CTA açma — EN SON, AYRI ONAY GEREKİR
- [ ] **[K][B]** Yalnız §0–§10 tamamlanıp doğrulandıktan **ve ayrı bir onay alındıktan sonra**: `apps/web/public/nexora-landing.html` içinde `BILLING_ENABLED = true` yap + landing CTA'larını app onboarding'ine bağla (şu an hosted Creem link'i pasif). **Bu bir kod değişikliğidir** — ayrı commit + review + deploy. Bu adım checklist'in geri kalanı yeşil olmadan ve açık onay olmadan UYGULANMAZ.
