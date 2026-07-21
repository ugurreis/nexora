# Nexora Billing — Go-Live Readiness

> Tek noktadan readiness özeti. Mevcut üç belgeyi birleştirir, yeni mimari/abstraction
> önermez:
> - `docs/CREEM_GO_LIVE_CHECKLIST.md` — operasyonel runbook
> - `docs/BILLING_PLATFORM_MIGRATION_BOUNDARY.md` — platform taşıma sınırı
> - `docs/STRIPE_RETIREMENT_PLAN.md` — söküm planı
>
> Etiketler: [Doğrulandı: kaynak] = teyit edildi · [Muhtemel] = güçlü çıkarım · [Tahmin] = varsayım.
> Sınıflandırma: 🟢 Product Only · 🟡 Platform Impact · 🔴 Out of Scope.

---

## 1. Mevcut Billing Durumu

### Tamamlananlar

- Provider-neutral billing sınırı: `BillingGateway` + factory + Creem adapter tek klasörde.
  [Doğrulandı: grep — `providers/creem` dışında Creem yok]
- 3 endpoint (`/api/billing/{checkout,portal,webhook}`): auth + `workspace:manage` IDOR guard;
  webhook imzası DB'den önce; idempotency (`lastEventId`) + ordering (`lastEventAt`);
  entitlement doğrulanmış status'ten; success URL server-side. [Doğrulandı: Faz A kodu + `BILLING.md`]
- DB: additive migration (8 neutral kolon + partial unique index), eski `stripe*` kolonları korundu.
  Local'e uygulandı + doğrulandı. [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md` §0, migration dosyası]
- Caller migration: 4 in-app caller `/api/stripe/*` → `/api/billing/*`; eski Stripe route'ları 410 Gone.
  [Doğrulandı: grep + `BILLING.md`]
- Test/gate: `@kan/api` 110/110, `@kan/db` 12/12, typecheck db+api temiz, `next build` exit 0,
  sherif temiz. [Doğrulandı: bu oturumda çalıştırıldı ve gözlemlendi]
- Risk azaltımı: landing satın-alma CTA'ları PR #11'de devre dışı — aktif Creem checkout linkleri
  kaldırıldı, kullanıcıya "Yakında" gösterilir. (`BILLING_ENABLED` diye bir flag YOKTUR; mekanizma
  link kaldırma + "Yakında"dır.) [Doğrulandı: `nexora-landing.html` + PR #11]
- Belgeler: `BILLING.md`, go-live checklist, platform boundary, retirement plan, PR #1 (Draft).

### Bilinçli ertelenenler

- **Feature gating / seat-limit (Faz B) ve krediler (Faz C)** — kapsam dışı.
- **Route-seviyesi HTTP testi yok** — güvenlik-kritik *mantık* unit + DB-integration ile test
  edildi; checkout/portal/webhook'un HTTP wiring'i (auth/ownership/status kodları) için harness yok.
  [Doğrulandı: `BILLING.md` Deferred]
- **Stripe coupling temizliği ertelendi** — `@kan/stripe`, `@better-auth/stripe` plugin,
  `listActiveSubscriptions`, `stripeCustomerId`, `subscription.stripe*` back-compat için duruyor.
  Söküm planı hazır ama go-live sonrası. [Doğrulandı: grep + `STRIPE_RETIREMENT_PLAN.md`]
- **`workspace_plan` enum rename** (`team/pro`↔`standard/premium`) yapılmadı; neutral `planKey`
  ayrı saklanıp mevcut enum'a eşleniyor. [Doğrulandı: `entitlement.ts`]
- **`past_due` grace penceresi yok** — bilinçli sert davranış.

### Bilinen riskler

- **Canlı uçtan-uca ödeme hiç test edilmedi** — kod hazır, ama gerçek Creem checkout → webhook →
  `workspace.plan` zinciri prod'da bir kez bile çalıştırılmadı. Go-live'ın en büyük açık kalemi.
- **Route-seviyesi test boşluğu** — auth/IDOR/status kodları yalnız manuel doğrulanacak.
- **Env-only redeploy Traefik routing drift'i geçmişte yaşandı** — deploy sonrası 200 kontrolü şart.
  [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md` §5, backlog dosyası]
- **İki abonelik sistemi bir arada** — better-auth Stripe plugin cloud modda yüklü olabilir; Creem
  webhook de `workspace.plan` yazıyor. Stripe tarafı dormant (aktif secret yok) ama kaldırılmadı.
  [Doğrulandı: `plugins.ts:59` cloud-gated + grep]

## 2. Creem Go-Live Checklist (özet — tam runbook: `CREEM_GO_LIVE_CHECKLIST.md`)

### Zorunlu ön koşullar (hepsi [B] Bloklayıcı)

- [ ] **[K]** PR #1 → deploy branch'e alınır + deploy edilir; migrate container additive
      migration'ı uygular. Bu olmadan `/api/billing/webhook` ve neutral kolonlar prod'da **yoktur**.
- [ ] **[M]** Coolify env: `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET` (secret), 4× `CREEM_PRODUCT_*`,
      `NEXT_PUBLIC_BASE_URL=https://nexora.nexovias.com`.
- [ ] **[M]** Creem dashboard → webhook URL `https://nexora.nexovias.com/api/billing/webhook`
      (mode:prod) + abonelik event'leri kaydı; signing secret → `CREEM_WEBHOOK_SECRET`.
- [ ] **[M]** Ürün ID eşlemesi (fiyat/period) Creem dashboard'da teyit — yanlış eşleme = yanlış plan satılır.

### Doğrulama adımları

- [ ] **[M]** Deploy sonrası `GET /api/billing/webhook` → **405** (endpoint canlı; 404 = routing sorunu).
- [ ] **[M]** `https://nexora.nexovias.com` → **200** (Traefik drift kontrolü).
- [ ] **[M]** Checkout: giriş yapmış kullanıcı + yönetilen workspace → Creem hosted sayfası açılır.
- [ ] **[M]** Düşük tutarlı **gerçek** ödeme → `subscription.active`/`paid` webhook → DB'de
      `provider='creem'` + `providerSubscriptionId` + `status='active'` satırı + `workspace.plan` güncel.
- [ ] **[M]** Geçersiz imza → **401**, DB değişmez. Idempotency: aynı event tekrarı entitlement bozmaz.
- [ ] **[M]** IDOR: başka workspace publicId ile checkout → **403**.
- [ ] **[M]** `past_due` → erişim anında `free`; `canceled`/`expired` → `workspace.plan='free'`.
- [ ] **[M]** Portal: `/settings` → Billing → Creem `customer_portal_link`, yalnız kendi kaydı.

### Rollback planı

- **Uygulama:** Coolify'da bir önceki image/commit'e redeploy → app-içi ödeme yolu eski haline döner.
- **Para akışı:** Landing CTA'ları PR #11'de devre dışı ("Yakında"; canlı Creem linkleri kaldırıldı)
  → kullanıcıdan para alınmaz. Creem tarafında webhook geçici devre dışı / ürün pasifle.
- **DB:** Additive migration geri alınabilir (veri yeniden yazılmaz); kolon DROP yalnız gerçekten
  gerekirse. Genelde kodu geri almak, kolonları bırakmak daha güvenli. [Doğrulandı: `CREEM_GO_LIVE_CHECKLIST.md` §9]
- **CTA yeniden etkinleştirme en son + ayrı onay** — "Yakında" kaldırılıp checkout wiring (Creem
  linki + app onboarding) geri getirilir; kod değişikliği, checklist geri kalanı yeşil olmadan yapılmaz.

## 3. Platform Migration Gate

### Neden bugün "platform-migratable"

- Provider bilgisi tek klasörde izole (`providers/creem/*`). [Doğrulandı: grep]
- Ürün-domain kuplajı tek dosyada: `entitlement.ts` (`planKey→workspace_plan`). [Doğrulandı]
- Kimlik/event kuplajı tek dosyada: `providers/creem/parse.ts` (`workspacePublicId` + event kind).
  [Doğrulandı]
- Gateway arayüzü provider'dan bağımsız; route'lar Creem import etmez. [Doğrulandı: grep]
- Migration'ın hangi parçayı taşıyacağı/sileceği/tutacağı belgeli. [Doğrulandı: boundary belgesi §2-§3]

### Neden henüz "platform-ready" değil

- THE NOVA billing sahiplik modeli (platform mı entegrasyonu üstlenir, ürün mü tutar) **kararlaşmadı**.
- Platform plan taksonomisi + kimlik sözleşmesi tanımlı değil.
- Sözleşme yokken ona karşı arayüz/adapter yazmak speculative generality olur (YAGNI) → yazılmadı.
- Neutral tiplerin gerçekten neutral olduğu ancak ikinci implementasyon/sözleşmeyle kanıtlanır;
  bugün hipotez. [Muhtemel]

### THE NOVA tarafında beklenen platform kararları

- 🟡 Sahiplik modeli seçimi (Model A: platform entegrasyonu sahiplenir / Model B: ürün sahiplenir,
  platform ortak sözleşme sağlar). [boundary belgesi §3]
- 🟡 Plan taksonomisi + kimlik (account/tenant) sözleşmesi.
- 🔴 Sözleşme netleşmeden platform contract arayüzü, çoklu-provider registry — kapsam dışı.

## 4. Risk Register

| # | Risk | Etki | Olasılık | Azaltma | Sahibi |
|---|------|------|----------|---------|--------|
| R1 | Canlı uçtan-uca ödeme hiç test edilmedi | Yüksek (ilk gerçek satış kırılabilir) | Orta | Checklist §6-§8 düşük-tutarlı gerçek smoke test; CTA kapalı kalır | Nexora |
| R2 | Route-seviyesi HTTP testi yok | Orta (auth/IDOR regresyonu geç yakalanır) | Orta | Go-live manuel IDOR/401/403 testleri; retirement öncesi harness | Nexora |
| R3 | Env-only redeploy Traefik drift'i | Yüksek (site down) | Orta | Deploy sonrası `/` 200 + webhook 405 kontrolü | Nexora |
| R4 | Webhook secret/env eksik → tüm webhook 401 | Yüksek (entitlement hiç yazılmaz) | Düşük | §3/§5 secret doğrulama; 405 + imza testi | Nexora |
| R5 | Yanlış `CREEM_PRODUCT_*` eşlemesi → yanlış plan satılır | Yüksek (yanlış tahsilat) | Düşük | §4 dashboard fiyat/period teyidi | Nexora |
| R6 | İki abonelik sistemi (better-auth Stripe + Creem) `workspace.plan`'a yazar | Orta (çakışma) | Düşük (Stripe dormant, aktif secret yok) | Retirement Adım 3'te plugin kaldır; go-live'da Stripe tarafına dokunma | Nexora |
| R7 | `past_due` grace'siz anında kesme | Düşük (kullanıcı deneyimi) | Orta | Bilinçli karar; gerekirse ayrı iş olarak grace | Nexora |
| R8 | Creem API/webhook kesintisi | Orta (checkout/entitlement gecikir) | Düşük | Provider retry (webhook 500→retry); monitoring | External (Creem) |
| R9 | Platform sahiplik modeli gecikince billing tek üründe kalır | Düşük (bugün sorun değil) | Orta | "Migratable" statüsü; iki temas noktası izole | THE NOVA |
| R10 | Stripe retirement yanlış sırada → prod kırılır | Yüksek | Düşük (plan sıralı, go-live sonrası) | `STRIPE_RETIREMENT_PLAN.md` zinciri; kolon DROP en son/şüphede yapma | Nexora |

## 5. Final Go-Live Kararı

**Kanıt durumu:**
- Kod tarafı hazır ve doğrulandı (testler, build, migration, imza/idempotency/IDOR mantığı).
  [Doğrulandı: bu oturum]
- Go-live **yalnızca manuel ops adımları + bir gerçek smoke test** ile mümkün; bunlar henüz
  **yapılmadı** (webhook kaydı, secret girişi, canlı ödeme doğrulaması açık). [Doğrulandı: checklist §0-§10 işaretsiz]
- Bloklayıcı bir kod defekti gözlemlenmedi; ama kanıtlanmış canlı çalışma da yok.

Bu iki gerçek 🟢'yi dışlar (koşullar karşılanmadı) ve 🔴'yi dışlar (bloklayıcı defekt yok, kod hazır).

### Karar: 🟡 Go-Live Ready with Conditions

**Koşullar (hepsi karşılanınca go-live):**
1. PR #1 deploy + additive migration prod'a uygulanır.
2. Coolify env + `CREEM_WEBHOOK_SECRET` + 4× `CREEM_PRODUCT_*` girilir.
3. Creem dashboard webhook kaydı + signing secret bağlanır.
4. Deploy sonrası `/` 200 + `/api/billing/webhook` 405 doğrulanır.
5. Bir düşük-tutarlı gerçek uçtan-uca abonelik + iptal/`past_due` senaryosu canlıda doğrulanır.
6. (En son, ayrı onay) landing CTA'ları yeniden etkinleştirilir: "Yakında" kaldırılıp checkout wiring geri getirilir.

Stripe retirement ve platform migration bu karara dahil **değildir**: retirement go-live sonrası
ayrı/kontrollü iş; platform migration THE NOVA kararı bekleyen ayrı gate.
