# Stripe Retirement Plan (Nexora)

> **ÖN KOŞUL — MUTLAK:** Bu plandaki HİÇBİR adım Creem go-live doğrulanmadan uygulanmaz.
> Retirement, Creem'in prod'da uçtan uca çalıştığı gözlemlenmeden başlarsa, tek seferde iki
> değişken oynatılmış olur (yeni yol gerçekten çalışıyor mu + eski yol söküldü mü) ve arıza
> izolasyonu imkânsızlaşır. `docs/CREEM_GO_LIVE_CHECKLIST.md` §0–§10 yeşil olmadan bu doküman
> yalnızca bir plandır, uygulama talimatı değildir.
>
> Kod içermez. İşaretler: 🟢 Product Only · 🟡 Platform Impact · 🔴 Out of Scope.

---

## 0. Kapsamı belirleyen kritik gerçek — `NEXT_PUBLIC_KAN_ENV`

Tüm Stripe abonelik yüzeyi `NEXT_PUBLIC_KAN_ENV === "cloud"` koşuluna bağlıdır
[Doğrulandı: `packages/auth/src/plugins.ts:59`, `packages/api/src/routers/member.ts:79/249/397/623`].

- **Nexora prod cloud modda ise:** better-auth Stripe plugin yüklenir ve member.ts seat-sync
  bloğu çalışır (ama Creem subs'unda `stripeSubscriptionId` boş olduğu için seat-sync no-op'tur).
- **Nexora prod cloud modda DEĞİLSE:** plugin hiç yüklenmez, seat-sync bloğu hiç girilmez —
  auth-tarafı söküm dramatik biçimde basitleşir.

**İlk adım (retirement başlamadan): Nexora prod'un `NEXT_PUBLIC_KAN_ENV` değerini doğrula.**
Bu değer bilinmeden söküm kapsamı doğru çizilemez. [Tahmin: Nexora ücretli plan sattığı için
büyük olasılıkla `cloud`, ama env değeri doğrulanmadı — söküm öncesi teyit ZORUNLU.]

## 1. Stripe yüzey envanteri (doğrulanmış)

Kaynak doğrulandı (grep, 2026-07-19):

**A. Better Auth Stripe entegrasyonu (`packages/auth/`)**
- `src/plugins.ts:1,13,61-176` — `@better-auth/stripe` `stripe()` plugin: team/pro plan tanımı,
  `STRIPE_*_PRICE_ID`, trial hook'ları, `onSubscription*` callback'leri,
  `cancelWorkspaceAccess` (→ `workspace.plan='free'` yazar). Cloud-gated. [Doğrulandı]
- `src/client.ts:3,31` — `stripeClient` (`@better-auth/stripe/client`). [Doğrulandı]
- `src/utils.ts:1-2,24,27-31` — `@better-auth/stripe` `Subscription` tipi + `stripe` `Stripe`
  tipi + `getByStripeCustomerId`. [Doğrulandı]
- `src/hooks.ts:25,119` — `stripeCustomerId`. [Doğrulandı]
- `src/auth.ts:53` — user `stripeCustomerId` alanı. [Doğrulandı]
- `package.json:33,41` — `@kan/stripe`, `@better-auth/stripe`. [Doğrulandı]

**B. Seat-sync (`packages/api/`)**
- `src/routers/member.ts:17` — `import { updateSubscriptionSeats } from "@kan/stripe"`.
- `src/routers/member.ts:104-109, 263-268, 648-653` — 3 çağrı noktası, hepsi cloud-gated
  (79/249/623) ve `activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats` guard'lı.
  `activeTeamSubscription` = `getSubscriptionByPlan(subscriptions,"team")`; `subscriptions`
  cloud bloğunda `listActiveSubscriptions`'tan gelir. [Doğrulandı]
- `src/trpc.ts:46,61-62` — `stripeCustomerId` + `listActiveSubscriptions` (`auth.api...`,
  better-auth Stripe plugin'ine bağlı). [Doğrulandı]
- `src/routers/user.ts:30` — çıktı şemasında `stripeCustomerId`. [Doğrulandı]
- `package.json:74` — `@kan/stripe`. [Doğrulandı]

**C. Uygulama/altyapı**
- `apps/web/src/env.ts:31` — `STRIPE_SECRET_KEY` (optional). [Doğrulandı]
- `apps/web/next.config.js:38` — `transpilePackages` içinde `@kan/stripe`. [Doğrulandı]
- `apps/web/package.json:79` — `@kan/stripe`. [Doğrulandı]
- `packages/stripe/*` — `@kan/stripe` paketinin kendisi (`createStripeClient`,
  `updateSubscriptionSeats`). [Doğrulandı]
- `apps/web/src/pages/api/stripe/{create_checkout_session,create_billing_session,webhook}.ts`
  — zaten **410 Gone** stub. [Doğrulandı]

**D. Şema (`packages/db/`)**
- `subscription` tablosunda legacy `stripe*` kolonları + `updateByStripeSubscriptionId`,
  `getByStripeCustomerId`; user tablosunda `stripeCustomerId`. Faz A'da korundu. [Doğrulandı]

## 2. Seat-sync kararı (ilk kapı)

Retirement'ın ilk mantıksal kararı: member.ts seat-sync'e ne olacak?

- **Nexora planları flat mı?** Faz A checkout `units=1` (flat) kullanır [Doğrulandı: `BILLING.md`].
  Flat planda per-seat faturalama yoktur → seat-sync **işlevsizdir**.
- **Karar:** Flat plan doğrulanırsa, member.ts'teki 3 `updateSubscriptionSeats` çağrısı ve
  `import`'u **kaldırılır** (Creem karşılığı yazılmaz — gereksiz). 🟢 Product Only
- **Aksi halde** (ileride seat-based plana geçilirse): bu ayrı bir Faz işi, retirement değil. 🔴

Bu karar, `@kan/stripe`'ın `packages/api` bağımlılığını kaldırmanın ön koşuludur.

## 3. Bağımlılık sırası (söküm zinciri)

Yanlış sıra prod'u kırar. Güvenli sıra — her adım bir öncekine bağlıdır:

```
0. NEXT_PUBLIC_KAN_ENV doğrula  →  Creem go-live doğrulandı mı? (yoksa DUR)
  1. member.ts seat-sync kaldır (flat plan kararı)         [@kan/stripe'ı api'den koparır]
    2. listActiveSubscriptions tüketicilerini neutral repo'ya bağla
      3. better-auth Stripe plugin'i kaldır (packages/auth)  [en kırılgan — auth akışı]
        4. @better-auth/stripe tip/client bağlarını temizle (utils.ts, client.ts, hooks.ts)
          5. env + paket temizliği (STRIPE_SECRET_KEY, @kan/stripe deps, next.config)
            6. packages/stripe paketini sil
              7. (EN SON) legacy 410 route'lar + subscription.stripe* kolonları (DROP)
```

**Neden bu sıra:** Kolon DROP (7) en riskli ve en az geri alınabilir işlemdir → en sona.
Auth plugin (3) prod login/session akışını etkileyebilir → izole ve tek başına deploy edilmeli.

## 4. Adım adım — doğrulama + rollback

Her adım: küçük, izole, ayrı deploy; sonraki adıma geçmeden doğrulanır.

### Adım 0 — Ön koşul kapısı 🟢
- **Yap:** `NEXT_PUBLIC_KAN_ENV` prod değerini oku; Creem go-live checklist §0–§10 yeşil mi teyit et.
- **Doğrula:** İkisi de sağlanmadan Adım 1'e geçme.
- **Rollback:** Yok (salt okuma).

### Adım 1 — Seat-sync kaldır 🟢
- **Yap:** member.ts'ten 3 `updateSubscriptionSeats` çağrısı + import kaldır (flat plan kararı §2).
- **Doğrula:** `@kan/api` test + typecheck; üye ekle/çıkar akışı hata vermez; grep `@kan/stripe`
  artık `packages/api`'de yok.
- **Rollback:** Commit revert (fonksiyonel yüzey değişmez — Creem'de zaten no-op'tu).

### Adım 2 — listActiveSubscriptions'ı ayır 🟡
- **Yap:** `trpc.ts:61` `listActiveSubscriptions` tüketicilerini neutral `subscription.repo`'ya
  yönlendir (better-auth Stripe API yerine kendi tablomuz). 🟡 çünkü auth-katmanı sözleşmesine dokunur.
- **Doğrula:** Abonelik-durumu okuyan her UI/endpoint doğru plan gösteriyor; typecheck temiz.
- **Rollback:** Commit revert; better-auth API çağrısı geri gelir.

### Adım 3 — Better Auth Stripe plugin'i kaldır 🟡
- **Yap:** `plugins.ts`'ten `stripe({...})` bloğunu ve `cancelWorkspaceAccess`'in Stripe'a bağlı
  kısmını kaldır. **Dikkat:** `cancelWorkspaceAccess` mantığı Creem webhook'una taşınmış mı teyit et —
  Creem `subscription.canceled/expired` zaten `workspace.plan='free'` yapıyor [Doğrulandı:
  `BILLING.md` entitlement], yani bu davranış Creem tarafında korunuyor; plugin'deki kopya güvenle kalkar.
- **Doğrula:** Login, signup, magic-link, OIDC akışları çalışır (plugin kaldırma auth'u kırmamalı);
  webhook iptal senaryosu hâlâ planı düşürür.
- **Rollback:** Commit revert; cloud-gate zaten koruyucu — plugin geri yüklenir.

### Adım 4 — `@better-auth/stripe` tip/client bağları 🟡
- **Yap:** `utils.ts`, `client.ts`, `hooks.ts`'teki `@better-auth/stripe` import + tiplerini kaldır;
  `getByStripeCustomerId` çağrılarını (varsa kalan) temizle.
- **Doğrula:** `@kan/auth` typecheck + build temiz; `@better-auth/stripe` grep sıfır.
- **Rollback:** Commit revert.

### Adım 5 — Env + paket temizliği 🟢
- **Yap:** `apps/web/src/env.ts` `STRIPE_SECRET_KEY` + kalan `STRIPE_*` kaldır; 3 `package.json`'dan
  `@kan/stripe` + `@better-auth/stripe`; `next.config.js:38` transpile girişi; `pnpm-lock` yenile.
- **Doğrula:** `pnpm install` temiz; tüm workspace typecheck + build; grep `STRIPE_` sıfıra yakın
  (yalnız doküman/plan kalabilir).
- **Rollback:** lockfile + package.json revert.

### Adım 6 — `packages/stripe` sil 🟢
- **Yap:** Hiçbir tüketici kalmadığını doğrulayıp `packages/stripe`'ı kaldır.
- **Doğrula:** grep `@kan/stripe` tüm repoda sıfır; monorepo build temiz.
- **Rollback:** git revert (paket geri gelir).

### Adım 7 — Legacy route + kolon temizliği (EN SON) 🟡
- **Yap:** `/api/stripe/*` 410 stub'ları kaldır; **ayrı ve en son**, `subscription.stripe*` +
  user `stripeCustomerId` kolonlarını migration ile DROP et.
- **Doğrula:** DROP öncesi tablo bu kolonlarda **veri tutmuyor** mu doğrula (Creem'e geçtikten
  sonra yeni kayıtlar `provider*` kolonlarını kullanır); staging'de migration + rollback provası.
- **Rollback:** Kolon DROP geri alınamaz → **en güvenli rollback kolonları hiç düşürmemektir.**
  Şüphe varsa Adım 7'nin kolon-DROP kısmını süresiz ertele; yalnız route stub'larını kaldır.
  Gerçekten gerekli değilse legacy kolonları bırakmak kabul edilebilir teknik borçtur.

## 5. Genel rollback ilkesi

- Her adım **ayrı commit + ayrı deploy**; birini geri almak diğerlerini etkilemez.
- Adım 1–2 fonksiyonel olarak nötr (Creem'de zaten no-op) → düşük risk.
- Adım 3–4 auth-katmanı → orta risk, tek başına deploy + login smoke test.
- Adım 7 kolon DROP → yüksek risk, geri alınamaz → şüphede **yapma**.
- Herhangi bir adımda prod'da anomali → o adımı revert, zinciri durdur, tekrar değerlendir.

## 6. Açık kural — Creem go-live'dan önce hiçbir retirement işlemi yapılmaz

Bu bir öncelik değil, **sert kapıdır**: Adım 0 geçilmeden (Creem prod'da uçtan uca doğrulanmadan)
Adım 1–7'nin hiçbiri başlatılmaz. Retirement, go-live sonrası **ayrı ve kontrollü** bir çalışmadır.
Bu doküman hazırlıktır; uygulama için ayrı ve açık bir onay gerekir.

## 7. Öneri sınıflandırması

| # | Adım | Sınıf |
|---|------|-------|
| 0 | `NEXT_PUBLIC_KAN_ENV` doğrula + go-live kapısı | 🟢 Product Only |
| 1 | member.ts seat-sync kaldır (flat plan) | 🟢 Product Only |
| 2 | `listActiveSubscriptions`'ı neutral repo'ya bağla | 🟡 Platform Impact |
| 3 | better-auth Stripe plugin kaldır | 🟡 Platform Impact |
| 4 | `@better-auth/stripe` tip/client bağları temizle | 🟡 Platform Impact |
| 5 | env + paket (`@kan/stripe`, `@better-auth/stripe`) temizliği | 🟢 Product Only |
| 6 | `packages/stripe` sil | 🟢 Product Only |
| 7 | legacy 410 route + `stripe*` kolon DROP (en son, geri alınamaz) | 🟡 Platform Impact |
| — | Creem go-live öncesi herhangi bir retirement adımı | 🔴 Out of Scope |
| — | Seat-based faturalama için Creem seat-sync yazmak | 🔴 Out of Scope |
