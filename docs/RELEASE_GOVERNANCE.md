# Billing — Release Governance

> Bu belge, billing ile ilgili **bundan sonraki tüm değişiklikler** için tek release standardıdır.
> Yeni özellik/mimari üretmez; mevcut Phase A yapısının nasıl güvenle evrileceğini yönetir.
>
> Etiketler: [Doğrulandı: kaynak] · [Muhtemel] · [Tahmin]. "Doğrulandı" yalnız gözlemlenmiş kanıtla.
> Sınıflandırma: 🟢 Product Only · 🟡 Platform Impact · 🔴 Out of Scope.
>
> İlgili belgeler: `BILLING.md` · `GO_LIVE_READINESS.md` · `GO_LIVE_EXECUTION_PLAN.md` ·
> `CREEM_GO_LIVE_CHECKLIST.md` · `STRIPE_RETIREMENT_PLAN.md` · `BILLING_PLATFORM_MIGRATION_BOUNDARY.md`.

---

## 1. Release prensipleri

1. **Kod ile dokümantasyon birlikte güncellenir.** Billing davranışını değiştiren hiçbir PR,
   ilgili belge güncellenmeden kabul edilmez.
2. **Sessiz mimari değişiklik yasak.** Provider sınırını, entitlement politikasını, sağlayıcı
   sözleşmesini veya DB şemasını değiştiren her PR bunu açıkça beyan eder ve sınıfını (🟢/🟡/🔴) işaretler.
3. **Provider-neutral sınır korunur.** Route'lar/entitlement Creem (veya herhangi bir sağlayıcı)
   SDK'sını import etmez; sağlayıcı bilgisi `providers/<x>/*` içinde kalır. [Doğrulandı: mevcut yapı, grep]
4. **Client'a güven yok.** Fiyat/product/plan client'tan gelen değere göre belirlenmez; server config esastır.
5. **Entitlement yalnız doğrulanmış webhook'tan değişir.** Success URL kanıt değildir.
6. **Fail closed.** Eksik kapsam/kanıt/onay = dur ve eskale et; varsayımla ilerleme.
7. **Her aşama ayrı onay.** Commit, push, PR, merge ve deploy için ayrı ve açık onay gerekir.
8. **Go-Live gate'i korunur.** Landing CTA (`BILLING_ENABLED`) yalnız go-live doğrulandıktan sonra,
   ayrı onayla açılır. Stripe retirement yalnız go-live sonrası (`STRIPE_RETIREMENT_PLAN.md`).

## 2. Değişiklik sınıfları

Sınıf, hem **risk** hem **doğrulama derinliğini** belirler.

### Patch — davranış değişmez
- Kapsam: bug fix, log/metin/refactor, davranışı değiştirmeyen dokümantasyon.
- Örnek: hata mesajı düzeltme, ölü değişken temizliği, yorum.
- **Sınıf genelde 🟢.** DB şeması, entitlement, webhook, sağlayıcı sözleşmesi **değişmez**.
- Doğrulama: §3 çekirdek (test + typecheck + build + lint) yeterli.

### Minor — geriye uyumlu davranış eklentisi
- Kapsam: additive DB kolonu, yeni event tipi işleme, yeni plan/period, yeni endpoint — **mevcut
  sözleşmeyi kırmadan**.
- Örnek: yeni `CREEM_PRODUCT_*`, additive migration, yeni webhook event kind.
- **Sınıf 🟢 veya 🟡** (entitlement/plan taksonomisi/kimlik dokunuluyorsa 🟡).
- Doğrulama: §3 çekirdek + migration doğrulaması + billing-özel senaryolar + i18n (UI varsa).

### Major — sözleşme veya davranış kıran değişiklik
- Kapsam: entitlement politikası değişimi, sağlayıcı ek/değiştirme, `workspace_plan` enum rename,
  webhook imza/sözleşme değişimi, DB kolon DROP, Stripe retirement adımları, platform migration.
- **Sınıf 🟡 (çoğu) veya 🔴** (THE NOVA sözleşmesi gerektiren, henüz kararlaşmamış işler).
- Doğrulama: §3 tümü + güvenlik gözden geçirme + rollback provası + iki temas noktası
  (`entitlement.ts`, `parse.ts`) etki analizi + belge güncellemesi zorunlu.

## 3. Zorunlu doğrulamalar (gerçek komutlar)

Kaynak doğrulandı: `package.json` scripts.

| Kontrol | Komut | Sınıf eşiği |
|---------|-------|-------------|
| Test | `pnpm -F @kan/api test`, `pnpm -F @kan/db test` (vitest) [Muhtemel: root'ta test script yok, paket bazında] | Her sınıf |
| Typecheck | `pnpm typecheck` (`turbo run typecheck`) [Doğrulandı: package.json:25] | Her sınıf |
| Build | `pnpm build` (`turbo run build`; web `next build`) [Doğrulandı: package.json:10] | Her sınıf |
| Lint | `pnpm lint` + `pnpm lint:ws` (sherif) [Doğrulandı: package.json:20,22] | Her sınıf |
| i18n | `pnpm i18n:check` [Doğrulandı: package.json:23] | UI/metin değişiminde |
| Migration | `pnpm db:migrate` (staging'de) + additive/rollback kontrolü [Doğrulandı: package.json:13] | DB değişiminde |

Her doğrulama **çalıştırılıp gözlemlenmeden** "geçti" denmez; PR'da komut + sonuç kanıtı belirtilir.

## 4. PR kabul kriterleri

Bir billing PR'ı ancak şunların **hepsi** sağlanınca kabul edilir:

- [ ] Değişiklik sınıfı (Patch/Minor/Major) + 🟢/🟡/🔴 işaretli.
- [ ] §3 zorunlu doğrulamalar çalıştırıldı, çıktı kanıtı PR'da.
- [ ] Provider-neutral sınır korunuyor (route'lar sağlayıcı SDK import etmiyor).
- [ ] Client'tan gelen fiyat/product/plan'a güvenilmiyor.
- [ ] Webhook imzası her DB yazımından önce doğrulanıyor; idempotency/ordering bozulmadı.
- [ ] IDOR guard (`workspace:manage`) etkilenmedi/korundu.
- [ ] DB değişikliği additive + geri alınabilir; kolon DROP ayrı ve gerekçeli.
- [ ] İlgili belge(ler) aynı PR'da güncellendi (§7).
- [ ] UI değişikliği varsa Visual Regression Audit yapıldı (§ kalıcı kural).
- [ ] Platform etkisi (🟡) varsa iki temas noktası etkisi + THE NOVA bağımlılığı belirtildi.
- [ ] Merge/deploy ayrı onaya bırakıldı (PR tek başına deploy yetkisi vermez).

## 5. Go-Live kabul kriterleri

Bir billing değişikliğinin canlıya alınması için (`GO_LIVE_READINESS.md` + `GO_LIVE_EXECUTION_PLAN.md`):

- [ ] Deploy + migration hatasız; `/` 200, webhook GET 405. [Doğrulandı: `webhook.ts:29-31`]
- [ ] Gerçek uçtan-uca senaryo doğrulandı (checkout → webhook → `subscription` + `workspace.plan`).
- [ ] Geçersiz imza 401, DB değişmez. [Doğrulandı: `webhook.ts:42`]
- [ ] IDOR 403; idempotency tekrar-event'te entitlement bozmuyor.
- [ ] `past_due`/iptal erişimi geri çekiyor.
- [ ] Env/secret Coolify'da set; repoda secret yok.
- [ ] CTA açma (varsa) en son + ayrı onay.

Kriterler karşılanana kadar `BILLING_ENABLED=false` kalır; hiçbiri varsayımla işaretlenmez.

## 6. Rollback kabul kriterleri

Bir billing release'i rollback-hazır sayılır ancak şunlar varsa:

- [ ] Bilinen-iyi bir geri dönüş noktası (önceki image/commit) not edildi.
- [ ] DB değişikliği geri alınabilir; kolon DROP yalnız veri yokken ve gerçekten gerekiyorsa.
- [ ] Para akışı durdurma yolu net (CTA kapalı + Creem webhook/ürün pasifleme).
- [ ] Rollback sonrası doğrulama tanımlı (`/` 200 + kritik akış smoke).
- [ ] Rollback'in yan etkisi (örn. entitlement tutarsızlığı) değerlendirildi.

Şüphede: geri alınamaz işlemi (kolon DROP) **yapma** — kodu geri al, kolonları bırak.

## 7. Dokümantasyon güncelleme zorunlulukları

Değişiklik türü → güncellenecek belge (aynı PR'da):

| Değişiklik | Güncellenecek |
|-----------|---------------|
| Entitlement/plan/period davranışı | `BILLING.md` (+ gerekiyorsa `GO_LIVE_*`) |
| Env/secret ekleme | `.env.example` + `BILLING.md` + `CREEM_GO_LIVE_CHECKLIST.md` |
| Webhook event/imza | `BILLING.md` + `GO_LIVE_EXECUTION_PLAN.md` |
| Go-live prosedürü | `GO_LIVE_EXECUTION_PLAN.md` + `CREEM_GO_LIVE_CHECKLIST.md` |
| Stripe söküm adımı | `STRIPE_RETIREMENT_PLAN.md` |
| Provider sınırı/platform | `BILLING_PLATFORM_MIGRATION_BOUNDARY.md` |
| Release durumu | `GO_LIVE_READINESS.md` |

Kod ve doküman **birlikte** merge edilir; "sonra güncellerim" kabul edilmez.

## 8. Release sonrası doğrulamalar

- [ ] İlk 24 saat izleme planı uygulandı (`GO_LIVE_EXECUTION_PLAN.md` §9): webhook 401/500 oranı,
      checkout 5xx, entitlement tutarlılığı, site 200 sürekliliği.
- [ ] Beklenen davranış canlıda gözlemlendi (varsayım değil, log/DB kanıtı).
- [ ] Anomali yoksa release "canlı ve doğrulanmış" işaretlenir; varsa incident süreci (§9).

## 9. Incident sonrası retrospektif süreci

1. **Tespit + sınıflandırma:** Belirti, etkilenen kullanıcı/para akışı, `GO_LIVE_EXECUTION_PLAN.md`
   §10 senaryolarıyla eşleştir.
2. **Anlık aksiyon:** İlgili incident aksiyonunu uygula (secret düzelt / rollback / Creem pasifleme).
3. **Kök neden:** Kanıta dayalı; "muhtemelen" ile kapatma — log/DB/kod ile doğrula.
4. **Kalıcı önlem:** Test boşluğu mu (örn. route-seviyesi HTTP testi), doğrulama eksiği mi, doküman mı?
   Somut madde çıkar.
5. **Belge + governance güncelle:** Gerekiyorsa bu belgeye yeni kontrol ekle; ilgili runbook'u düzelt.
6. **Retrospektif kaydı:** Ne oldu / ne işe yaradı / ne geliştirilecek — kısa, kanıtlı.

---

## Her değişiklik için ZORUNLU kontrol listesi

Her billing PR'ında **10 boyut** işaretlenir. Uygulanmıyorsa "N/A + gerekçe" yazılır (boş bırakılmaz).

- [ ] **Kod** — Cerrahi değişiklik; provider-neutral sınır korundu; yalnız görevin gerektirdiği satırlar.
- [ ] **Test** — Yeni/etkilenen davranış test edildi; `pnpm -F @kan/api test` + `@kan/db test` geçti (kanıt).
- [ ] **Build** — `pnpm build` geçti (kanıt). [Doğrulandı: komut package.json:10]
- [ ] **Migration** — Additive + geri alınabilir; staging'de uygulandı; kolon DROP ayrı/gerekçeli.
- [ ] **Security** — İmza-önce-DB, IDOR guard, client'a güvenmeme, secret repoda değil.
- [ ] **Billing** — Entitlement/idempotency/ordering davranışı doğrulandı; success URL kanıt sayılmadı.
- [ ] **Dokümantasyon** — İlgili belge(ler) aynı PR'da güncel (§7).
- [ ] **Lokalizasyon** — Metin değiştiyse Lingui katalogları + `pnpm i18n:check` geçti; TR/EN doğal dil. [Doğrulandı: i18n:check package.json:23]
- [ ] **UI etkisi** — UI değiştiyse Visual Regression Audit yapıldı (desktop + mobil).
- [ ] **Platform etkisi** — 🟡 ise iki temas noktası (`entitlement.ts`, `parse.ts`) + THE NOVA bağımlılığı belirtildi.

Ve değişiklik **tek sınıfla** işaretlenir: 🟢 Product Only · 🟡 Platform Impact · 🔴 Out of Scope.

## Kalıcı kurallar (özet)

- Kod ile dokümantasyon **birlikte** güncellenir.
- UI değişikliği varsa **Visual Regression Audit zorunlu**.
- TR ve EN metinlerde **doğal ürün dili** — birebir çeviri değil.
- Commit, push, PR, merge, deploy için **ayrı onay**.
- "Doğrulandı" **yalnız kanıt** varsa.
- **Sessiz mimari değişiklik yok** — her sözleşme/şema/politika değişimi açıkça beyan edilir.
