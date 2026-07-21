# Nexora Billing — Go-Live Execution Plan

> Go-Live günü operasyon runbook'u. **Bu belge plandır — uygulama talimatı değildir.**
> Her gerçek production adımı ancak açık, ayrı bir onayla ve `docs/GO_LIVE_READINESS.md`
> 🟡 koşulları karşılandığında uygulanır. Kod değişikliği içermez, mimari önermez.
>
> Etiketler: [Doğrulandı: kaynak] = teyit edildi · [Muhtemel] = güçlü çıkarım · [Tahmin] = varsayım.
> Adım şablonu — her adımda: **Ön koşul · İşlem · Beklenen sonuç · Başarısızlıkta · Doğrulama**.

## Doğrulanmış sabitler

| Sabit | Değer | Kaynak |
|-------|-------|--------|
| Domain | `https://nexora.nexovias.com` | [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md`] |
| Webhook path | `/api/billing/webhook` | [Doğrulandı: route dosyası mevcut] |
| Webhook method map | POST işlenir · GET/diğer → 405 · imza hatası → 401 · parse hatası → 400 · actionable-değil → 200 · transient → 500 | [Doğrulandı: `webhook.ts:29-31,42,45,57,117`] |
| İmza | header `creem-signature`, HMAC-SHA256 hex, raw body | [Doğrulandı: `providers/creem/signature.ts` + `webhook.ts:13`] |
| Success URL | `${NEXT_PUBLIC_BASE_URL}/settings?billing=success` | [Doğrulandı: checkout route] |
| Migration | `20260718200900_creem_billing_provider_neutral.sql` (additive) | [Doğrulandı: migration dosyası] |
| Coolify app uuid | `yjlhqzqktb12xpnk9qf8ja2r` | [Muhtemel: checklist'te kayıtlı, panelden teyit edilecek] |
| Deploy branch | `kanbantr-faz0` (Coolify'ın izlediği branch) | [Muhtemel: local'de var; Coolify panelinden teyit — Adım 5.1] |
| Landing CTA | `BILLING_ENABLED=false` (go-live boyunca kapalı) | [Doğrulandı: `nexora-landing.html`] |

Secret'lar (`CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`) yalnız Coolify'da; repoda tutulmaz.

---

## 1. Go-Live öncesi kontroller

### 1.1 Readiness koşullarının açık olduğunu teyit et
- **Ön koşul:** `GO_LIVE_READINESS.md` verdict 🟡; PR #1 review'u tamam.
- **İşlem:** 6 go-live koşulunu (deploy, env, webhook, doğrulama, smoke test, CTA) gözden geçir; sorumlu + sıra netleştir.
- **Beklenen sonuç:** Her koşulun sahibi ve sırası belli; bloklayıcı açık soru yok.
- **Başarısızlıkta:** Açık soru varsa go-live'ı ertele; eksik kalemi kapat.
- **Doğrulama:** Checklist üzerinden madde-madde işaretleme; ekip onayı.

### 1.2 `NEXT_PUBLIC_KAN_ENV` prod değerini oku
- **Ön koşul:** Coolify env erişimi.
- **İşlem:** Prod `NEXT_PUBLIC_KAN_ENV` değerini oku (cloud mu, değil mi). Bu değer paid-akış ve better-auth Stripe plugin davranışını belirler [Doğrulandı: `plugins.ts:59`].
- **Beklenen sonuç:** Değer net; go-live'da Stripe tarafının dormant kaldığı biliniyor.
- **Başarısızlıkta:** Belirsizse Coolify env'i netleşene kadar deploy'a geçme.
- **Doğrulama:** Coolify env paneli okuması.

### 1.3 Rollback hedefini sabitle
- **Ön koşul:** Coolify deployment geçmişi erişimi.
- **İşlem:** Mevcut prod image/commit'i (billing öncesi) rollback hedefi olarak not et.
- **Beklenen sonuç:** Bilinen-iyi bir geri dönüş noktası kayıtlı.
- **Başarısızlıkta:** Geçmiş yoksa deploy öncesi mevcut sürümü etiketle/işaretle.
- **Doğrulama:** Coolify'da hedef deployment görünür + not edildi.

## 2. Creem Dashboard hazırlıkları

### 2.1 Ürünlerin canlı (mode:prod, active) olduğunu teyit et
- **Ön koşul:** Creem dashboard erişimi (prod).
- **İşlem:** 4 ürünün prod ve active olduğunu doğrula:
  `STANDARD_MONTHLY=prod_5EgV8S8rAQ0iprEFUXsnfS`, `STANDARD_YEARLY=prod_3BXDShfWhwzCEtrFUVvcFb`,
  `PREMIUM_MONTHLY=prod_351g0O7RRGz6WrxTmP4fxM`, `PREMIUM_YEARLY=prod_48NrhOFXv5QBb6FyXSW7G9`
  [Doğrulandı: bu oturumda prod/active teyit edildi + checklist §4].
- **Beklenen sonuç:** 4 ürün prod/active; fiyat ve period doğru.
- **Başarısızlıkta:** Yanlış/eksik ürün varsa dashboard'da düzelt; env eşlemesini güncelle.
- **Doğrulama:** Dashboard ürün listesi + fiyat/period görsel teyidi.

### 2.2 Fiyat/period eşleşmesini env sırasına göre teyit et
- **Ön koşul:** 2.1 tamam.
- **İşlem:** Her `CREEM_PRODUCT_*` env anahtarının doğru ürüne (plan+period) karşılık geldiğini kontrol et. Yanlış eşleme = yanlış plan/fiyat satışı (R5).
- **Beklenen sonuç:** 4 eşleme birebir doğru.
- **Başarısızlıkta:** Eşlemeyi düzeltmeden deploy'a geçme.
- **Doğrulama:** Dashboard fiyatı ↔ env anahtar adı çapraz kontrol.

## 3. Secret ve environment doğrulaması

### 3.1 Zorunlu env'leri Coolify'a gir
- **Ön koşul:** Coolify erişimi; Creem prod API key elde.
- **İşlem:** Gir: `CREEM_API_KEY` (secret), 4× `CREEM_PRODUCT_*`, `NEXT_PUBLIC_BASE_URL=https://nexora.nexovias.com`. `CREEM_WEBHOOK_SECRET` §4.3'te. `CREEM_API_BASE` ve `BILLING_PROVIDER` set edilmez (default `api.creem.io` / `creem`).
- **Beklenen sonuç:** Tüm zorunlu env'ler set; `NEXT_PUBLIC_BASE_URL` prod domain.
- **Başarısızlıkta:** Eksik env → checkout/webhook config hatası; girene kadar deploy'u durdur.
- **Doğrulama:** Coolify env listesi; secret'ların maskeli göründüğü.

### 3.2 Secret'ların repoda olmadığını teyit et
- **Ön koşul:** Repo erişimi.
- **İşlem:** `CREEM_API_KEY`/`CREEM_WEBHOOK_SECRET` değerlerinin repoda bulunmadığını doğrula.
- **Beklenen sonuç:** Repo temiz; secret yalnız Coolify'da.
- **Başarısızlıkta:** Sızıntı varsa key'i rotate et + geçmişten temizle, sonra devam.
- **Doğrulama:** `git grep` ile secret pattern araması (değer sıfır sonuç).

## 4. Webhook kurulumu ve doğrulaması

### 4.1 Webhook URL'ini belirle
- **Ön koşul:** Domain canlı.
- **İşlem:** Kayıt URL'i: `https://nexora.nexovias.com/api/billing/webhook`.
- **Beklenen sonuç:** URL net.
- **Başarısızlıkta:** Domain farklıysa `NEXT_PUBLIC_BASE_URL` ile hizala.
- **Doğrulama:** URL string kontrolü.

### 4.2 Creem'de webhook + event aboneliği oluştur
- **Ön koşul:** 4.1; Adım 5 deploy (endpoint canlı olmalı — aksi halde delivery test başarısız).
- **İşlem:** Creem → Developers → Webhooks → URL'i mode:prod kaydet; abone ol:
  `subscription.active/paid/trialing/update/scheduled_cancel/paused/past_due/canceled/expired`,
  `refund.created`, `dispute.created`. (`checkout.completed` seçilse de kod no-op geçer.)
- **Beklenen sonuç:** Webhook prod'da kayıtlı, event seti tam.
- **Başarısızlıkta:** Eksik event → ilgili durum işlenmez; aboneliği tamamla.
- **Doğrulama:** Dashboard webhook kaydı + event listesi görünür.

### 4.3 Signing secret'i Coolify'a gir
- **Ön koşul:** 4.2 tamam.
- **İşlem:** Creem'in ürettiği signing secret'i kopyala → Coolify `CREEM_WEBHOOK_SECRET` (secret). Env değişimi container'a yansıması için restart/redeploy gerekir.
- **Beklenen sonuç:** `CREEM_WEBHOOK_SECRET` set; imza doğrulama etkin.
- **Başarısızlıkta:** Eksikse webhook her isteği 401 reddeder [Doğrulandı: `webhook.ts:42`]; gir + redeploy.
- **Doğrulama:** §4.4 imza testi.

### 4.4 Endpoint canlılık + imza davranışı testi
- **Ön koşul:** Deploy + `CREEM_WEBHOOK_SECRET` set.
- **İşlem:** `GET /api/billing/webhook` çağır; ardından geçersiz `creem-signature` ile POST.
- **Beklenen sonuç:** GET → **405**; geçersiz imza POST → **401**, DB değişmez [Doğrulandı: `webhook.ts:29-31,42`].
- **Başarısızlıkta:** GET 404 → deploy/routing sorunu (Adım 5'e dön); 401 gelmiyorsa secret/imza kurulumunu incele.
- **Doğrulama:** HTTP status gözlemi + DB satır sayısı değişmedi kontrolü.

## 5. Production deployment sırası

### 5.1 Deploy branch'ini teyit et
- **Ön koşul:** Coolify erişimi; PR #1 review tamam.
- **İşlem:** Coolify'ın izlediği deploy branch'i teyit et (`kanbantr-faz0` beklenir [Muhtemel]); PR #1 içeriğinin bu branch'e nasıl geçeceğini (merge/rebase) netleştir. **Not:** Merge/deploy ayrı açık onay gerektirir.
- **Beklenen sonuç:** Doğru branch + geçiş yöntemi net.
- **Başarısızlıkta:** Branch belirsizse panelden doğrula; yanlış branch'e deploy etme.
- **Doğrulama:** Coolify app → Source/Branch alanı okuması.

### 5.2 Deploy + additive migration
- **Ön koşul:** 5.1; env'ler set (Adım 3).
- **İşlem:** Deploy tetikle. Migrate container additive migration'ı (`20260718200900`) uygular — 8 nullable kolon + partial unique index; veri yeniden yazılmaz [Doğrulandı: migration dosyası].
- **Beklenen sonuç:** Build geçer; migration uygulanır; container ayakta.
- **Başarısızlıkta:** Build/migration hatası → deploy'u durdur, logu incele, rollback hedefine dön (1.3).
- **Doğrulama:** Coolify deploy logu; migration adımı hatasız; container running.

### 5.3 Endpoint + site canlılık kontrolü (Traefik drift dahil)
- **Ön koşul:** 5.2 tamam.
- **İşlem:** `GET https://nexora.nexovias.com/` ve `GET .../api/billing/webhook`.
- **Beklenen sonuç:** `/` → **200**; webhook GET → **405**.
- **Başarısızlıkta:** `/` 200 değilse env-only redeploy Traefik drift'i olası (geçmişte yaşandı) → routing'i düzelt/redeploy [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md` §5]. Webhook 404 → routing/deploy sorunu.
- **Doğrulama:** HTTP status gözlemi.

## 6. Canlı smoke test senaryoları

### 6.1 Checkout başlatma
- **Ön koşul:** Deploy + env + webhook kaydı tamam; giriş yapmış test kullanıcısı + yönetilen workspace.
- **İşlem:** `/settings` → upgrade → checkout başlat.
- **Beklenen sonuç:** Creem hosted ödeme sayfası açılır; server-side product id + success URL kullanılır.
- **Başarısızlıkta:** 500/redirect yoksa `CREEM_API_KEY`/product env + checkout logunu incele.
- **Doğrulama:** Tarayıcıda Creem sayfası; ağ isteğinde `checkout_url` döndü.

### 6.2 Düşük-tutarlı gerçek ödeme → webhook → entitlement
- **Ön koşul:** 6.1.
- **İşlem:** Düşük tutarlı gerçek ödeme tamamla.
- **Beklenen sonuç:** `/settings?billing=success`'e dönüş; `subscription.active`/`paid` webhook gelir; DB'de `provider='creem'` + `providerSubscriptionId` + `status='active'` + `lastEventId` dolu satır; ilgili `workspace.plan` `team`/`pro`.
- **Başarısızlıkta:** Webhook gelmedi → Creem delivery log + `CREEM_WEBHOOK_SECRET`; DB yazılmadı → webhook 500/401 log incele.
- **Doğrulama:** Creem delivery log + DB satır sorgusu + `workspace.plan` sorgusu.

### 6.3 IDOR (yetki) testi
- **Ön koşul:** İkinci kullanıcı/workspace.
- **İşlem:** Başka kullanıcının workspace publicId'siyle `POST /api/billing/checkout`.
- **Beklenen sonuç:** **403** (`workspace:manage` guard) [Doğrulandı: checkout route].
- **Başarısızlıkta:** 403 gelmiyorsa go-live'ı durdur — yetki açığı; guard'ı incele.
- **Doğrulama:** HTTP status + audit.

### 6.4 Idempotency
- **Ön koşul:** 6.2 tamam.
- **İşlem:** Creem "resend" ile aynı event'i tekrar tetikle.
- **Beklenen sonuç:** İkinci teslimde entitlement değişmez; `workspace.plan` bozulmaz (duplicate → 200 no-op) [Doğrulandı: `webhook.ts:96-101`].
- **Başarısızlıkta:** Plan değişir/bozulursa `lastEventId` dedup mantığını incele.
- **Doğrulama:** DB durumu değişmedi + log "skipped (idempotent)".

### 6.5 Başarısız ödeme / iptal / expire
- **Ön koşul:** 6.2 tamam.
- **İşlem:** Test kartıyla yenileme başarısızlığı (`past_due`); ardından iptal/expire senaryosu.
- **Beklenen sonuç:** `past_due` → erişim **anında** `free` (grace yok); `canceled`/`expired` → `workspace.plan='free'`, ücretli özellik kaybolur [Doğrulandı: `entitlement.ts` + `BILLING.md`].
- **Başarısızlıkta:** Erişim geri çekilmiyorsa entitlement/webhook eşlemesini incele.
- **Doğrulama:** DB `status` + `workspace.plan` + UI'da özellik erişimi.

### 6.6 Portal
- **Ön koşul:** 6.2 tamam (aktif abonelik).
- **İşlem:** `/settings` → Billing portal.
- **Beklenen sonuç:** Creem `customer_portal_link` açılır; yalnız kendi kaydına erişim.
- **Başarısızlıkta:** Açılmıyorsa portal route + `providerCustomerId` filtresini incele.
- **Doğrulama:** Tarayıcıda Creem portal + kayıt sahipliği.

## 7. Başarı kriterleri

Go-Live'ın "canlı ve doğrulanmış" sayılması için **hepsi** gözlemlenmeli:

- [ ] Deploy + migration hatasız; `/` 200, webhook GET 405. (5.2, 5.3)
- [ ] Bir gerçek uçtan-uca abonelik: checkout → webhook → `subscription` satırı + `workspace.plan`. (6.2)
- [ ] Geçersiz imza 401, DB değişmez. (4.4)
- [ ] IDOR 403. (6.3)
- [ ] Idempotency: tekrar event entitlement bozmaz. (6.4)
- [ ] `past_due`/iptal erişimi geri çeker. (6.5)
- [ ] Portal yalnız kendi kaydını açar. (6.6)

Bu kriterler karşılanana kadar `BILLING_ENABLED=false` kalır; hiçbir kriter "varsayımla" işaretlenmez.

## 8. Rollback planı

### 8.1 Uygulama rollback
- **Ön koşul:** 1.3'te not edilen hedef.
- **İşlem:** Coolify'da billing öncesi image/commit'e redeploy.
- **Beklenen sonuç:** App-içi ödeme yolu eski haline döner; site 200.
- **Başarısızlıkta:** Redeploy başarısızsa bir önceki bilinen-iyi deployment'a in.
- **Doğrulama:** `/` 200 + kritik akış smoke.

### 8.2 Para akışını durdur
- **Ön koşul:** Para akışında sorun.
- **İşlem:** Landing zaten `BILLING_ENABLED=false` (kullanıcıdan para alınmaz); Creem dashboard'dan webhook'u geçici devre dışı bırak / ürünleri pasifle.
- **Beklenen sonuç:** Yeni tahsilat durur.
- **Başarısızlıkta:** Creem desteğiyle ürün/checkout'u kapat.
- **Doğrulama:** Dashboard webhook/ürün durumu.

### 8.3 DB rollback (yalnız zorunlu ve tablo boşsa)
- **Ön koşul:** Gerçekten gerekli; kolonlarda veri yok.
- **İşlem:** Additive migration geri alınabilir — `DROP INDEX` + 8× `DROP COLUMN` (elle; drizzle down üretmez). Eski `stripe*` kolonları korunur.
- **Beklenen sonuç:** Neutral kolonlar kalkar; veri kaybı yok.
- **Başarısızlıkta:** Şüphe varsa DROP yapma — yalnız kodu geri al, kolonları bırak (kabul edilebilir borç).
- **Doğrulama:** Şema sorgusu; better-auth/partner akışı etkilenmedi. [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md` §9]

## 9. Go-Live sonrası ilk 24 saat izleme planı

### 9.1 Webhook sağlığı
- **Ön koşul:** Go-live tamam.
- **İşlem:** Creem delivery log + app logunda webhook 200/401/500 oranını izle.
- **Beklenen sonuç:** 401 sıfıra yakın (yalnız gerçek imzalar); 500 kalıcı değil (transient retry ile kapanır).
- **Başarısızlıkta:** 401 yükseldi → secret/imza; 500 kalıcı → DB/kod, gerekirse rollback.
- **Doğrulama:** Log/delivery sayaçları; örnek event izleme.

### 9.2 Checkout dönüşümü
- **İşlem:** Checkout başlatma → tamamlanma oranı ve 5xx'leri izle.
- **Beklenen sonuç:** Anlamlı 5xx yok; başlatılan checkout'lar success/webhook'a ulaşıyor.
- **Başarısızlıkta:** 5xx artışı → `CREEM_API_KEY`/product/config incele.
- **Doğrulama:** Ağ/log gözlemi.

### 9.3 Entitlement tutarlılığı
- **İşlem:** Yeni `subscription` satırları ↔ `workspace.plan` senkron mu; iki-sistem çakışması (R6) belirtisi var mı izle.
- **Beklenen sonuç:** `active/trialing` → paid; diğer → free; Stripe tarafı sessiz.
- **Başarısızlıkta:** Plan drift'i → webhook log + entitlement eşlemesini incele.
- **Doğrulama:** Periyodik DB tutarlılık sorgusu.

### 9.4 Site/altyapı
- **İşlem:** `/` 200 sürekliliği (Traefik drift), container restart/hata, kaynak kullanımı.
- **Beklenen sonuç:** Site 200 sabit; anormal restart yok.
- **Başarısızlıkta:** Drift/kesinti → routing düzelt/redeploy; gerekirse rollback.
- **Doğrulama:** Uptime kontrolü + Coolify container durumu.

## 10. Olası incident senaryoları ve aksiyonlar

| # | Senaryo | Belirti | Aksiyon | Doğrulama |
|---|---------|---------|---------|-----------|
| I1 | Webhook tümü 401 | Hiç entitlement yazılmıyor, delivery log 401 | `CREEM_WEBHOOK_SECRET` düzelt + redeploy (4.3) | İmza testi 401→200 |
| I2 | Webhook kalıcı 500 | Delivery retry döngüsü, log DB hatası | DB/bağlantı incele; düzelmezse app rollback (8.1) | 500 durur, satır yazılır |
| I3 | Checkout 500 | Hosted sayfa açılmıyor | `CREEM_API_KEY`/product env kontrol; düzelmezse CTA zaten kapalı, sakin ol | 6.1 tekrar başarılı |
| I4 | Yanlış plan/fiyat satıldı | Kullanıcı yanlış planla ücretlendi | Creem'de refund; `CREEM_PRODUCT_*` eşlemesini düzelt (2.2) | Doğru eşleme + refund kaydı |
| I5 | Traefik drift, site down | `/` 200 değil | Routing düzelt/redeploy; gerekirse rollback (8.1) | `/` 200 |
| I6 | Entitlement verilmedi (ödeme alındı) | Ödeme var, `workspace.plan` free | Webhook delivery + `workspacePublicId` metadata incele; manuel plan düzelt | DB `workspace.plan` doğru |
| I7 | Çift entitlement kaynağı çakışması (R6) | Plan beklenmedik `free`'ye düşüyor | better-auth Stripe plugin aktivitesini kontrol; go-live'da Stripe tarafına dokunma | Log'da tek kaynak yazıyor |
| I8 | Migration prod'da başarısız | Deploy migrate adımı hata | Deploy durdur; rollback hedefine dön (1.3); migration'ı incele | Container eski sürümde 200 |
| I9 | Refund/dispute geldi | `refund.created`/`dispute.created` event | Entitlement etkisini gözle; iş kararı (erişim/iade) | DB + dashboard tutarlı |

---

> **Son not:** Bu plan uygulama için açık onay bekler. Hiçbir adım (deploy, env, webhook kaydı,
> canlı ödeme, CTA açma) bu belgeyle otomatik yetkilendirilmiş sayılmaz. Stripe retirement ve
> platform migration bu plana dahil değildir — ayrı gate'ler (`STRIPE_RETIREMENT_PLAN.md`,
> `BILLING_PLATFORM_MIGRATION_BOUNDARY.md`).
