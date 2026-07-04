import { BRAND_COMPANY, BRAND_NAME } from "~/lib/brand";
import { LegalContent, LegalDoc } from "../legal/LegalDoc";

const tr: LegalContent = {
  title: "Gizlilik Politikası",
  updated: "Son güncelleme: 3 Temmuz 2026",
  blocks: [
    {
      h: "Giriş",
      p: [
        `Gizliliğiniz bizim için önemlidir. Bu Gizlilik Politikası, ${BRAND_COMPANY} tarafından işletilen ${BRAND_NAME} hizmeti (“Hizmet”) kapsamında kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar. Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) ve ilgili mevzuata uygun olarak işlenir.`,
      ],
    },
    {
      h: "Topladığımız Bilgiler",
      p: [
        "Hizmeti kullanırken bize doğrudan sağladığınız bilgileri ve Hizmete erişiminiz sırasında otomatik olarak oluşan teknik bilgileri toplarız. Bunlar şunları içerebilir:",
      ],
      ul: [
        "Ad ve e-posta adresi gibi hesap bilgileri.",
        "Oluşturduğunuz pano, liste, kart ve yorum gibi içerik verileri.",
        "IP adresi, tarayıcı türü, ziyaret edilen sayfalar ve tarih/saat gibi kayıt (log) verileri.",
      ],
    },
    {
      h: "Verileri Kullanma Amaçlarımız",
      p: [
        "Kişisel verilerinizi yalnızca meşru bir amaç bulunduğunda ve hizmeti sunmak için gerekli olduğu ölçüde işleriz:",
      ],
      ul: [
        "Hizmete erişiminizi sağlamak ve sürdürmek.",
        "Sizinle iletişim kurmak ve destek taleplerinizi yanıtlamak.",
        "Hizmeti geliştirmek, güvenliğini sağlamak ve kötüye kullanımı önlemek.",
        "Yasal yükümlülüklerimizi yerine getirmek.",
      ],
    },
    {
      h: "Verilerin Güvenliği",
      p: [
        "Kişisel verilerinizi kayıp, hırsızlık ve yetkisiz erişime karşı korumak için makul teknik ve idari tedbirleri alırız. Bununla birlikte, hiçbir elektronik iletim veya depolama yönteminin %100 güvenli olmadığını hatırlatırız. Bir veri ihlali durumunda yürürlükteki mevzuata uygun olarak hareket ederiz.",
      ],
    },
    {
      h: "Verilerin Saklanma Süresi",
      p: [
        "Kişisel verilerinizi yalnızca işleme amacının gerektirdiği süre boyunca ve yürürlükteki mevzuatın öngördüğü süreler dâhilinde saklarız. Verilere artık ihtiyaç kalmadığında bunları siler veya kimliğinizi belirlemeyecek şekilde anonim hâle getiririz.",
      ],
    },
    {
      h: "Verilerin Üçüncü Kişilerle Paylaşımı",
      p: [
        "Kişisel verilerinizi satmayız. Verilerinizi yalnızca aşağıdaki hâllerde ve gerekli olduğu ölçüde paylaşabiliriz:",
      ],
      ul: [
        "Barındırma, veri depolama ve altyapı gibi hizmetleri sağlayan yüklenicilerimizle (yalnızca hizmeti sunmaları amacıyla).",
        "Ödeme işlemlerini yürüten ödeme altyapısı sağlayıcımızla (yalnızca ödemeyi gerçekleştirmek amacıyla).",
        "Yürürlükteki mevzuat gereği yetkili kamu kurumları ve adli mercilerle.",
      ],
    },
    {
      h: "KVKK Kapsamındaki Haklarınız",
      p: [
        "KVKK’nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işleme amacını öğrenme, eksik veya yanlış işlenmiş verilerin düzeltilmesini, mevzuatta öngörülen şartlarla silinmesini veya yok edilmesini isteme ve işlemenin hukuka aykırı olması hâlinde zararın giderilmesini talep etme haklarına sahipsiniz. Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.",
      ],
    },
    {
      h: "Çocukların Gizliliği",
      p: [
        "Hizmetimiz 13 yaşın altındaki çocuklara yönelik değildir ve bilerek 13 yaşın altındaki çocuklara ait kişisel veri toplamayız.",
      ],
    },
    {
      h: "Politikadaki Değişiklikler",
      p: [
        "Bu Gizlilik Politikasını iş süreçlerimizdeki, güncel uygulamalardaki veya mevzuattaki değişiklikleri yansıtmak için zaman zaman güncelleyebiliriz. Değişiklikler bu sayfada yayımlandığında yürürlüğe girer.",
      ],
    },
    {
      h: "İletişim",
      p: [
        "Gizliliğinizle ilgili soru ve talepleriniz için bize {email} adresinden ulaşabilirsiniz.",
      ],
    },
  ],
};

const en: LegalContent = {
  title: "Privacy Policy",
  updated: "Last updated: 3 July 2026",
  blocks: [
    {
      h: "Introduction",
      p: [
        `Your privacy matters to us. This Privacy Policy explains how we collect, use and protect your personal data in connection with the ${BRAND_NAME} service (the “Service”), operated by ${BRAND_COMPANY}. Personal data is processed in accordance with Turkish Law No. 6698 on the Protection of Personal Data (“KVKK”) and applicable regulations.`,
      ],
    },
    {
      h: "Information We Collect",
      p: [
        "We collect information you provide to us directly when using the Service, as well as technical information generated automatically as you access it. This may include:",
      ],
      ul: [
        "Account information such as your name and email address.",
        "Content data such as the boards, lists, cards and comments you create.",
        "Log data such as IP address, browser type, pages visited and date/time.",
      ],
    },
    {
      h: "How We Use Data",
      p: [
        "We process your personal data only where there is a legitimate purpose and to the extent necessary to provide the Service:",
      ],
      ul: [
        "To provide and maintain your access to the Service.",
        "To communicate with you and respond to your support requests.",
        "To improve the Service, secure it and prevent abuse.",
        "To comply with our legal obligations.",
      ],
    },
    {
      h: "Data Security",
      p: [
        "We take reasonable technical and administrative measures to protect your personal data against loss, theft and unauthorized access. That said, no method of electronic transmission or storage is 100% secure. In the event of a data breach we act in accordance with applicable law.",
      ],
    },
    {
      h: "Data Retention",
      p: [
        "We retain your personal data only for as long as the purpose of processing requires and within the periods prescribed by applicable law. When data is no longer needed, we delete it or anonymize it so that you can no longer be identified.",
      ],
    },
    {
      h: "Sharing With Third Parties",
      p: [
        "We do not sell your personal data. We may share it only in the following cases and only to the extent necessary:",
      ],
      ul: [
        "With our contractors that provide hosting, data storage and infrastructure (solely to deliver the Service).",
        "With our payment provider that processes payments (solely to complete the transaction).",
        "With competent public authorities and judicial bodies where required by applicable law.",
      ],
    },
    {
      h: "Your Rights Under KVKK",
      p: [
        "Under Article 11 of the KVKK you have the right to learn whether your personal data is processed, request information about it, learn the purpose of processing, request correction of incomplete or inaccurate data, request its erasure or destruction under the conditions set by law, and claim compensation where processing is unlawful. To exercise these rights, please contact us.",
      ],
    },
    {
      h: "Children’s Privacy",
      p: [
        "Our Service is not directed to children under 13, and we do not knowingly collect personal data from children under 13.",
      ],
    },
    {
      h: "Changes to This Policy",
      p: [
        "We may update this Privacy Policy from time to time to reflect changes in our business practices, current implementations or the law. Changes take effect when published on this page.",
      ],
    },
    {
      h: "Contact",
      p: [
        "For any questions or requests regarding your privacy, you can reach us at {email}.",
      ],
    },
  ],
};

export default function PrivacyView() {
  return <LegalDoc tr={tr} en={en} />;
}
