// Ürün marka kimliği (Nexora). Nihai ürün adı/iletişim bilgisi belli olunca
// yalnızca burayı değiştir. Görünür wordmark, sayfa başlıkları, hukuk metinleri
// ve footer bu sabitleri kullanır.
export const BRAND_NAME = "Nexora";

// Tarayıcı sekmesi başlık son eki, ör. "Giriş | Nexora".
export const BRAND_TITLE_SUFFIX = BRAND_NAME;

// Ürünü işleten tüzel/ticari isim (hukuk metinlerinde geçer).
export const BRAND_COMPANY = "Nexovias";

// İletişim/destek e-postası. TODO: gerçek Nexovias destek adresiyle doğrula.
export const BRAND_CONTACT_EMAIL = "destek@nexovias.com";

// Pazarlama/ana alan adı (hukuk metinlerinde ve footer'da geçer).
export const BRAND_DOMAIN = "nexovias.com";

// Kaynak/lisans/self-host bağlantıları — müşteri-yüzünde ESKİ "Kan" markası GÖSTERİLMEZ.
// AGPL-3.0 uyumu [Muhtemel]: ağ üzerinden servis edilen değiştirilmiş türev, kullanıcıya
// KENDİ değiştirilmiş kaynağını sunmalıdır. Nexora'nın public kaynak reposu belli olunca
// BRAND_SOURCE_URL ve BRAND_SELF_HOST_DOCS_URL gerçek URL ile güncellenmeli.
// TODO(branding): gerçek public repo / self-host docs URL'lerini bağla.
export const BRAND_SOURCE_URL = `https://${BRAND_DOMAIN}`; // TODO: Nexora public kaynak repo URL'si
export const BRAND_SELF_HOST_DOCS_URL = `https://${BRAND_DOMAIN}`; // TODO: Nexora self-host docs URL'si
// AGPL-3.0 kanonik metni (marka-nötr; doğru lisans).
export const BRAND_LICENSE_URL = "https://www.gnu.org/licenses/agpl-3.0.html";
