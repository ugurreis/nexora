# Nexora i18n — Teknik Plan (Türkçe-first korunur)

> Durum: **Planlama dokümanı** (kod/çeviri/UI değişikliği yok). **Yeni i18n sistemi önerilmez** —
> mevcut Lingui mimarisi düzeltilir. Amaç: EN locale'de kalan karışık dili kademeli, kırmadan gidermek.

## 1. Mevcut Lingui mimarisi `[Doğrulandı: apps/web/lingui.config.ts + locales/*/messages.json]`
- **`sourceLocale: "en"`**; locales: `en, fr, de, es, it, nl, ru, pl, pt-BR, tr`.
- Katalog: `apps/web/src/locales/{locale}/messages.json`, format `@lingui/format-json` style
  `lingui`. Girişler **hash-ID** anahtarlı (ör. `PpZkda`), her giriş `{message, translation,
  origin, obsolete, ...}`.
- Kaynak string'ler component'lerde `t\`…\`` (Lingui macro). ID, kaynak mesajdan türetilir →
  **kaynak mesajı değiştirmek ID'yi değiştirir**.
- Toplam **1048** giriş; **171 obsolete**; **85 Türkçe-kaynak (non-obsolete) msgid**.

## 2. Türkçe-first ürün kararı (KORUNUR)
Ürün bilinçli **Türkçe-first** ("tamamen Türkçe · İngilizce menü yok" satış argümanı; manifest
"Sade, tamamen Türkçe Kanban"). **Primary kullanıcı TR.** Bu plan İngilizceleştirme *dayatmaz*;
yalnız `sourceLocale=en` hijyenini sağlar ve EN locale'i tutarlı yapar. TR deneyimi değişmez.

## 3. Servis edilen vs edilmeyen yüzeyler `[Doğrulandı: middleware.ts matcher ["/"]]`
- **Servis EDİLMEYEN:** React landing `views/home/*` (Footer, Faqs, Cta, home/index, Layout). `/`
  statik `public/nexora-landing.html`'e rewrite edilir (ayrı `data-i18n` sistemi — Lingui değil).
  → Bu dosyalardaki karışık dil **kullanıcıya görünmez**; öncelik değil, "düzeltmek" boşa emek.
- **Servis EDİLEN (React/Lingui):** `/pricing`, `/login`, `/signup`, authenticated app
  (board/boards/card/members/settings/analytics…).
- **Sonuç:** i18n düzeltmeleri **yalnız servis edilen Lingui yüzeylerinde** anlamlı.

## 4. Sorunun doğru tanımı (iki yön)
`sourceLocale=en` + hash-ID katalog nedeniyle:
- **TR user (primary):** servis edilen yüzeylerde **gerçek İngilizce sızıntı YOK** `[Doğrulandı: en/tr
  katalog + origin + obsolete analizi]`. Boş-tr girişler Türkçe-kaynak → doğru Türkçe fallback;
  İngilizce string'ler ya obsolete ya zaten çevrili. → **TR için düzeltme gerekmez.**
- **EN user (secondary):** **85 Türkçe-kaynak msgid** İngilizce fallback bulamaz → İngilizce arayüzde
  Türkçe kelimeler görür (karışık dil). Asıl sorun budur.

## 5. 85 Türkçe-msgid için kademeli geçiş planı

### 5.1 Neden dikkatli olmalı (risk)
Bir Türkçe kaynak msgid'i İngilizce'ye çevirmek **hash-ID'yi değiştirir** → o eski ID'ye bağlı tüm
locale çevirileri (özellikle tr) **eşleşmeyi kaybeder** → düzgün yönetilmezse TR user İngilizce görür.
Bu yüzden her adım **kaynak + extract + tr çeviri** birlikte yapılmalı.

### 5.2 Doğru yöntem (mevcut Lingui ile, yeni sistem yok)
Her partide, servis edilen bir yüzey grubu için:
1. Component'te `t\`Türkçe\`` → `t\`English\`` (kaynak İngilizce; sabit marka için `${BRAND_NAME}` gibi
   interpolation korunur).
2. `pnpm lingui extract` (mevcut süreç) → tüm kataloglar yeniden üretilir (yeni EN msgid + eski
   Türkçe-msgid obsolete).
3. **tr katalogda** yeni EN msgid'lerin `translation`'ına **Türkçe metni** yaz (kaynaktan taşınan
   Türkçe). → TR user aynı Türkçe'yi görmeye devam eder (davranış değişmez).
4. `pnpm lingui compile` (gerekiyorsa) + `tsc` baseline karşılaştırması (0 yeni hata).

### 5.3 Partiler (öncelik: EN ziyaretçinin ilk gördüğü → derinlik)
- **Parti 1 — Public servis edilen:** `/pricing`, `/login`, `/signup` (kısa etiketler; İngilizce
  net). Düşük risk, yüksek görünürlük.
- **Parti 2 — App chrome (kısa etiketler):** board/boards/card menü + buton + toast (Panolar,
  Şablonlar, Pano oluştur, Favorilere ekle…). Mekanik, tutarlı.
- **Parti 3 — App uzun içerik:** hata/onay/açıklama cümleleri (İngilizce yazımı dikkat ister).
- Her parti **ayrı, tek-sorumluluklu PR**; yerel typecheck + baseline karşılaştırması; **merge
  öncesi onay**.
- ⚠️ Uzun Türkçe içeriğin İngilizce'ye çevrilmesi *içerik yazımı*dır (kalite hassas) → gerekirse
  insan gözden geçirmesi.

## 6. Obsolete katalog temizliği (AYRI hijyen işi)
- **171 obsolete** giriş + stale `| kan.bn` başlık msgid'leri runtime'da eşleşmez (audit #8). Bunlar
  **kullanıcıya görünmez** (ölü katalog kaydı).
- Bu plan bunları **KAPSAMAZ**; ayrı hijyen PR'ında `lingui extract` ile temizlenir. Karıştırılmaz
  (tek sorumluluk).

## 7. Riskler (kaynak msgid / katalog / extract / compile / fallback)
| Risk | Açıklama | Azaltma |
|------|----------|---------|
| **Kaynak msgid değişimi** | ID değişir → tr eşleşmesi kaçar | kaynak+extract+tr çeviri aynı PR'da |
| **Katalog churn** | extract 10 locale'i yeniden üretir → büyük diff | parti-parti, gözden geçirilebilir tut |
| **Compile** | derlenmiş katalog güncel değilse eski render | her partide compile + doğrula |
| **Fallback** | boş tr → kaynağa düşer; kaynak İngilizce olunca TR sızar | tr çeviriyi ayNI partide doldur |
| **Servis-edilmeyen düzeltme** | home/* boşa emek (görünmez) | yalnız servis edilen yüzeyler |

## 8. Kapsam-dışı / yapılmayacaklar
- Yeni i18n sistemi/kütüphanesi **önerilmez** (mevcut Lingui).
- `sourceLocale` **değiştirilmez** (altyapı; en kalır).
- Bu doküman **UI/çeviri değiştirmez** (yalnız plan).
- Türkçe-first marka dili **değişmez**.

## 9. Önerilen uygulama sırası
1. Parti 1 (public: pricing/login/signup) — ayrı PR, onay.
2. Parti 2 (app chrome kısa etiketler) — ayrı PR, onay.
3. Parti 3 (app uzun içerik; İngilizce yazımı gözden geçirilir) — ayrı PR, onay.
4. Obsolete katalog hijyeni — ayrı PR (bu plandan bağımsız).
