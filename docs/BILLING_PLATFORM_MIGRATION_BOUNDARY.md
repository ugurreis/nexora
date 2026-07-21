# Billing — Platform Migration Boundary (Nexora ↔ THE NOVA)

> Karar dokümanı — kod içermez, mevcut abstraction'ı genişletmez. Amaç: Nexora'nın
> billing sorumluluklarını netleştirmek ve ileride THE NOVA merkezi billing'e taşıma
> sınırını **bugünden abstraction eklemeden** çizmek.
>
> **Statü: Nexora billing bugün "platform-ready" DEĞİL, "platform-migratable"dır.**
> Bu ayrım kasıtlıdır (bkz. §6). THE NOVA billing sahiplik modeli kararlaşana kadar
> yeni platform sözleşmesi veya abstraction yazılmayacaktır.

Sınıflandırma işaretleri: 🟢 Product Only · 🟡 Platform Impact · 🔴 Out of Scope.

---

## 1. Nexora'nın bugün sahip olduğu billing sorumlulukları

Kaynak doğrulandı (Faz A kodu, 2026-07-19):

| Sorumluluk | Nerede | Not |
|-----------|--------|-----|
| Provider entegrasyonu (Creem) | `packages/api/src/billing/providers/creem/*` | checkout · portal · webhook client, imza, parse, status |
| Provider-neutral sınır | `packages/api/src/billing/{gateway,types}.ts` | `BillingGateway` + factory (`BILLING_PROVIDER`) |
| Webhook imza doğrulama | `providers/creem/signature.ts` + `adapter.ts` | HMAC-SHA256, raw body, DB'den önce |
| Webhook → kalıcılık | `packages/db/.../subscription.repo.ts` `applyProviderWebhookEvent` | idempotency (`lastEventId`) + ordering (`lastEventAt`), `FOR UPDATE` |
| Idempotency & ordering | aynı repo + `subscription` tablosu | ürün DB şemasına bağlı |
| Entitlement politikası | `packages/api/src/billing/entitlement.ts` | `active`/`trialing` → paid; diğeri → free |
| Plan taksonomisi eşlemesi | `entitlement.ts` `workspacePlanFromKey` | `standard→team`, `premium→pro` — **ürün-domain** |
| HTTP yüzeyi | `apps/web/src/pages/api/billing/{checkout,portal,webhook}.ts` | auth, IDOR guard, success URL |
| Ürün kimliği çözümü | `providers/creem/config.ts` | `CREEM_PRODUCT_*` env → product id |

Kısaca: Nexora bugün billing'in **tamamını** (entegrasyon + webhook işleme + kalıcılık +
entitlement) sahiplenir. Bu, product-local thin adapter kararının (Faz A) doğal sonucudur.

## 2. THE NOVA'ya taşınabilecek sorumluluklar

Taşınabilirlik parçaya göre değişir — modül tek parça değildir:

| Parça | Taşınabilirlik | Taşımada ne olur |
|------|----------------|-------------------|
| `BillingGateway` + `providers/creem/*` | **Yüksek** | Merkezi billing'in provider katmanı olur; neredeyse olduğu gibi taşınır |
| Webhook imza + parse | **Yüksek** | Platform üstlenirse Nexora'dan **silinir**, taşınmaz |
| `applyProviderWebhookEvent` + `subscription` tablosu | **Düşük** | Platform kendi store'unu getirir; ürün DB şemasına bağlı |
| `entitlement.ts` plan eşlemesi | **Taşınmaz — kalır** | `team`/`pro` Nexora enum'ı; platform bunu bilmez |
| 3 HTTP route | **Orta** | İskelet kalır, içi "platforma sor"a döner |

**Kritik netleştirme:** "Billing'i platforma taşıyoruz" ifadesi yanıltıcıdır. Gerçekte olan:
*provider entegrasyonu + webhook işleme* platforma **devredilir**, *entitlement tüketimi*
Nexora'da kalıp bir platform API'sine bağlanır.

## 3. İki olası sahiplik modeli

### Model A — Platform, provider/webhook entegrasyonunu sahiplenir

Merkezi THE NOVA billing servisi Creem/Paddle/… entegrasyonunu, webhook alımını ve
abonelik kalıcılığını üstlenir. Nexora yalnızca **entitlement tüketicisi** olur: "bu
workspace'in planı ne?" sorusunu platform API'sinden sorar.

- **Avantaj:** Tek merkezde provider bilgisi; ürünler webhook/imza/idempotency kodu taşımaz;
  yeni ürünler billing'i "bedava" alır; secret'lar tek yerde.
- **Risk:** Ürünler platform uptime'ına bağımlı hale gelir (billing API down → entitlement
  okunamaz, cache/fallback gerekir); platform sözleşmesi drift ederse tüm ürünler etkilenir;
  Nexora'nın bugünkü webhook/persistence kodunun **çoğu silinir** (yatırım geri dönüşü düşük
  ama teknik borç da azalır).
- **Migration etkisi:** `providers/creem/*` + webhook route platforma taşınır/silinir;
  `entitlement.ts` bir platform-client'a dönüşür; `subscription` tablosu okuma-cache'ine iner
  veya kalkar. **En büyük değişim, en temiz uzun vadeli sonuç.**

### Model B — Ürün entegrasyonu sahiplenir, platform ortak sözleşme sağlar

Her ürün kendi provider entegrasyonunu ve webhook'unu tutar; THE NOVA yalnızca ortak
**sözleşme + paylaşılan kütüphane** (tipler, `BillingGateway` arayüzü, imza yardımcıları,
entitlement politikası konvansiyonları) sağlar. Nexora'nın bugünkü yapısı buna zaten yakın.

- **Avantaj:** Ürünler bağımsız kalır (billing API uptime bağımlılığı yok); Nexora'nın Faz A
  yatırımı korunur; taşıma maliyeti düşük — `packages/api/src/billing`'i paylaşılan bir pakete
  çıkarmak yeterli olabilir.
- **Risk:** Provider entegrasyon kodu ürünler arası **kopyalanır/çatallanır** (aynı Creem
  adapter'ı iki üründe drift edebilir); secret yönetimi dağınık kalır; "ortak kütüphane"
  sürüm uyumu bir bakım yükü doğurur.
- **Migration etkisi:** Minimal. `billing/` klasörü `@nova/billing-kit` benzeri paylaşılan bir
  pakete taşınır; `providers/creem/*` üründe kalır; `entitlement.ts` ürün-local kalır.
  **En küçük değişim, ama merkezîleşme kazancı sınırlı.**

### Karar notu

İki model arasındaki seçim bir **implementasyon tercihi değil, sahiplik/otorite kararıdır**
(billing = Shared Foundation; Authority = THE NOVA Dev OS). Karar verilene kadar Nexora
tarafında **hiçbir platform sözleşmesi veya abstraction yazılmayacaktır** (🔴).

## 4. Her modelin drift/temas yükü — mevcut iki temas noktası

Hangi model seçilirse seçilsin, drift maliyeti **iki dosyaya** hapsedilmiştir. Bu, Faz A'nın
kasıtlı tasarımıdır — platform sözleşmesi netleşince değişecek yerler yalnızca bunlardır:

- **`packages/api/src/billing/entitlement.ts`** — plan taksonomisi teması.
  `planKey (standard/premium) → workspace_plan (team/pro)` eşlemesi burada. Platform kendi plan
  modelini dayatırsa (Model A) veya ortak plan sözlüğü tanımlarsa (Model B), **yalnız bu dosya**
  değişir. `workspace_plan` enum'ı Nexora'ya özgüdür; neutral katmanın bildiği tek ürün-domain
  kavramı budur ve bilinçli olarak tek noktada tutulmuştur. [Doğrulandı: `entitlement.ts`]

- **`packages/api/src/billing/providers/creem/parse.ts`** — kimlik + event teması.
  Neutral event'in taşıdığı `metadata.workspacePublicId` (ürün kimliği) ve Creem event
  tiplerinin neutral `BillingEventKind`'a eşlenmesi burada. Platform farklı bir hesap/tenant
  kimliği veya event sözlüğü kullanırsa, **yalnız bu dosya** yeniden eşlenir.
  [Doğrulandı: `providers/creem/parse.ts`]

**Sonuç:** Yeni katman ekleyerek drift'e karşı korunmaya çalışmak (bir "platform contract"
arayüzü yazmak) 🔴 Out of Scope'tur — henüz var olmayan bir sözleşmeye karşı abstraction
speculative generality olur (YAGNI). Doğru mitigasyon, drift'i bu iki dosyada tutma disiplinidir.

## 5. Interface drift eksenleri (özet)

- **Plan taksonomisi:** `standard/premium` + `team/pro` ↔ platform plan modeli.
- **Kimlik modeli:** `workspacePublicId` ↔ platform account/tenant kimliği.
- **Sorumluluk sınırı:** Model A'da webhook/persistence Nexora'dan silinir; Model B'de kalır.
- **Event taksonomisi:** `BillingEventKind` bugün Creem event setinden türemiştir; ikinci
  sağlayıcı veya platform sözleşmesi gelene kadar gerçekten neutral olduğu **kanıtlanmamıştır**
  (hipotez, gözlem değil). [Muhtemel]

## 6. "Platform-migratable" tanımı — kabul kriterleri

Nexora billing'in **"platform-migratable"** sayılması için (bugün karşılanan durum):

- [x] Provider bilgisi tek klasörde izole (`providers/creem/*` dışında Creem yok).
      [Doğrulandı: grep]
- [x] Ürün-domain kuplajı tek dosyada (`entitlement.ts` plan eşlemesi). [Doğrulandı]
- [x] Kimlik/event kuplajı tek dosyada (`parse.ts`). [Doğrulandı]
- [x] Gateway arayüzü provider'dan bağımsız (route'lar Creem import etmez). [Doğrulandı: grep]
- [x] Migration'ın hangi parçayı taşıyacağı/sileceği/tutacağı belgelidir (§2, §3).

**"Platform-ready"** ise (bugün karşılanMAyan, kasıtlı ertelenen durum) şunları gerektirir:

- [ ] THE NOVA billing sahiplik modeli (A veya B) kararlaşmış olmalı. 🟡 Platform Impact
- [ ] Platform plan taksonomisi + kimlik sözleşmesi tanımlı olmalı. 🟡 Platform Impact
- [ ] Bu sözleşmeye karşı gerçek bir arayüz/adapter yazılmış ve test edilmiş olmalı.
      (Sözleşme yokken YAZILMAZ — 🔴.)

Bu kriterler karşılanana kadar modül **"migratable"** olarak anılacak; "ready" iddiası
yapılmayacaktır.

## 7. Öneri sınıflandırması

| # | Madde | Sınıf |
|---|-------|-------|
| 1 | Drift'i `entitlement.ts` + `parse.ts` iki temas noktasında tutma disiplini | 🟢 Product Only |
| 2 | Modülü "platform-migratable" olarak belgeleme (bu doküman) | 🟢 Product Only |
| 3 | THE NOVA billing sahiplik modeli kararı (Model A / Model B) | 🟡 Platform Impact |
| 4 | Platform plan taksonomisi + kimlik sözleşmesi tanımı | 🟡 Platform Impact |
| 5 | Model B seçilirse `billing/`'i paylaşılan pakete çıkarma | 🟡 Platform Impact |
| 6 | Sözleşme yokken "platform contract" arayüzü / abstraction yazmak | 🔴 Out of Scope |
| 7 | Çoklu provider registry / aynı anda birden fazla provider | 🔴 Out of Scope |
