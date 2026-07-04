import { BRAND_COMPANY, BRAND_CONTACT_EMAIL, BRAND_NAME } from "~/lib/brand";
import { LegalContent, LegalDoc } from "../legal/LegalDoc";

const tr: LegalContent = {
  title: "Kullanım Koşulları",
  updated: "Son güncelleme: 3 Temmuz 2026",
  blocks: [
    {
      h: "Giriş",
      p: [
        `Bu Kullanım Koşulları (“Koşullar”), ${BRAND_COMPANY} tarafından işletilen ${BRAND_NAME} hizmetinin (“Hizmet”) kullanımını düzenler. Hizmete erişerek veya Hizmeti kullanarak bu Koşulları okuduğunuzu, anladığınızı ve bunlarla bağlı olmayı kabul ettiğinizi beyan edersiniz.`,
        "Kişisel verilerinizi nasıl işlediğimiz {privacy} belgesinde açıklanmıştır ve bu belge Koşulların ayrılmaz bir parçasıdır.",
        `Koşulları kabul etmiyorsanız Hizmeti kullanmamalısınız. Sorularınız için ${BRAND_CONTACT_EMAIL} adresinden bize ulaşabilirsiniz.`,
      ],
    },
    {
      h: "Hesaplar",
      p: [
        "Bir hesap oluşturduğunuzda bize verdiğiniz bilgilerin doğru, eksiksiz ve güncel olduğunu taahhüt edersiniz. Yanlış, eksik veya güncel olmayan bilgiler hesabınızın askıya alınmasına ya da kapatılmasına yol açabilir.",
        "Hesap parolanızın ve hesabınıza erişimin gizliliğini korumaktan siz sorumlusunuz. Hesabınız üzerinden gerçekleşen tüm işlemlerden sorumlu olduğunuzu kabul edersiniz. Yetkisiz bir erişim veya güvenlik ihlali fark ettiğinizde derhal bize bildirmelisiniz.",
      ],
    },
    {
      h: "Abonelik, Ücretler ve İadeler",
      p: [
        "Ücretli planlar, ilgili sayfada belirtilen ücretlere ve dönemlere tabidir. Ödemeler, üçüncü taraf ödeme altyapısı sağlayıcımız (Merchant of Record) üzerinden tahsil edilir; ödeme sırasında geçerli fiyat ve para birimi gösterilir.",
        "Abonelikler, iptal edilene kadar ilgili dönem sonunda otomatik olarak yenilenir. Aboneliğinizi istediğiniz zaman iptal edebilirsiniz; iptal, mevcut dönemin sonunda geçerli olur. İade talepleri, ödeme sağlayıcısının ve yürürlükteki mevzuatın koşullarına tabidir.",
      ],
    },
    {
      h: "İçerik",
      p: [
        "Hizmet üzerinde oluşturduğunuz, yüklediğiniz veya paylaştığınız tüm içerik (“İçerik”) size aittir. İçeriğinizin yasalara uygunluğundan ve üçüncü kişilerin haklarını ihlal etmemesinden siz sorumlusunuz.",
        `İçeriğinize ilişkin tüm haklar sizde kalır. ${BRAND_COMPANY}, Hizmeti sunmak ve işletmek için gereken ölçüde İçeriğinizi barındırma ve işleme hakkına sahiptir; bunun dışında İçeriğiniz üzerinde mülkiyet iddia etmez.`,
      ],
    },
    {
      h: "Yasak Kullanımlar",
      p: [
        "Hizmeti yalnızca yasal amaçlarla kullanabilirsiniz. Şunları yapmamayı kabul edersiniz:",
      ],
      ul: [
        "Yürürlükteki herhangi bir ulusal veya uluslararası mevzuatı ihlal edecek şekilde Hizmeti kullanmak.",
        "Başkalarını taciz etmek, tehdit etmek, dolandırmak veya onlara zarar vermek.",
        "Hizmete, sunuculara veya bağlı sistemlere yetkisiz erişim sağlamaya çalışmak.",
        "Virüs, truva atı, solucan veya kötü amaçlı başka bir yazılım yaymak.",
        "Hizmetin normal işleyişini bozacak veya aşırı yük bindirecek (örneğin hizmet dışı bırakma saldırıları) davranışlarda bulunmak.",
      ],
    },
    {
      h: "Fikri Mülkiyet",
      p: [
        `Kullanıcı İçeriği hariç olmak üzere Hizmetin özgün içeriği, özellikleri ve işlevleri ${BRAND_COMPANY} ve lisans verenlerinin mülkiyetindedir ve fikri mülkiyet mevzuatı ile korunur. Markalarımız ve ticari takdim şeklimiz, yazılı önceden iznimiz olmadan kullanılamaz.`,
        `${BRAND_NAME}, AGPL-3.0 lisansı altında yayımlanan açık kaynak bir yazılım temel alınarak geliştirilmiştir; ilgili açık kaynak lisansı saklıdır.`,
      ],
    },
    {
      h: "Garanti Reddi",
      p: [
        `Hizmet “olduğu gibi” ve “mevcut olduğu ölçüde” sunulur. Yürürlükteki mevzuatın izin verdiği azami ölçüde, ${BRAND_COMPANY} Hizmetin kesintisiz, hatasız veya belirli bir amaca uygun olacağına dair açık ya da zımni hiçbir garanti vermez.`,
      ],
    },
    {
      h: "Sorumluluğun Sınırlandırılması",
      p: [
        `Yürürlükteki mevzuatın izin verdiği azami ölçüde, ${BRAND_COMPANY}; Hizmetin kullanımından veya kullanılamamasından doğan dolaylı, arızi, özel veya sonuç niteliğindeki zararlardan sorumlu tutulamaz.`,
      ],
    },
    {
      h: "Fesih",
      p: [
        "Koşulların ihlali dâhil olmak üzere haklı bir sebeple, önceden bildirimde bulunmaksızın hesabınıza erişimi askıya alabilir veya sonlandırabiliriz. Hesabınızı istediğiniz zaman kullanmayı bırakarak sonlandırabilirsiniz.",
      ],
    },
    {
      h: "Uygulanacak Hukuk",
      p: [
        "Bu Koşullar, Türkiye Cumhuriyeti kanunlarına tabidir ve bu kanunlara göre yorumlanır. Koşullardan doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir.",
      ],
    },
    {
      h: "Koşullardaki Değişiklikler",
      p: [
        "Koşulları zaman zaman güncelleyebiliriz. Güncellenen Koşulları bu sayfada yayımlarız. Değişikliklerin ardından Hizmeti kullanmaya devam etmeniz, güncel Koşulları kabul ettiğiniz anlamına gelir.",
      ],
    },
    {
      h: "İletişim",
      p: [
        "Bu Kullanım Koşulları hakkında sorularınız için bize {email} adresinden ulaşabilirsiniz.",
      ],
    },
  ],
};

const en: LegalContent = {
  title: "Terms of Service",
  updated: "Last updated: 3 July 2026",
  blocks: [
    {
      h: "Introduction",
      p: [
        `These Terms of Service (the “Terms”) govern your use of the ${BRAND_NAME} service (the “Service”), operated by ${BRAND_COMPANY}. By accessing or using the Service, you confirm that you have read, understood and agree to be bound by these Terms.`,
        "How we process your personal data is described in our {privacy}, which forms an integral part of these Terms.",
        `If you do not accept the Terms, you must not use the Service. For questions, you can reach us at ${BRAND_CONTACT_EMAIL}.`,
      ],
    },
    {
      h: "Accounts",
      p: [
        "When you create an account, you undertake that the information you provide is accurate, complete and up to date. Inaccurate, incomplete or outdated information may lead to suspension or closure of your account.",
        "You are responsible for keeping your account password and access confidential. You accept responsibility for all activity that occurs under your account. You must notify us immediately if you become aware of any unauthorized access or security breach.",
      ],
    },
    {
      h: "Subscriptions, Fees and Refunds",
      p: [
        "Paid plans are subject to the fees and billing periods stated on the relevant page. Payments are collected through our third-party payment provider (Merchant of Record); the applicable price and currency are shown at checkout.",
        "Subscriptions renew automatically at the end of each period until cancelled. You may cancel at any time; cancellation takes effect at the end of the current period. Refund requests are subject to the terms of the payment provider and applicable law.",
      ],
    },
    {
      h: "Content",
      p: [
        "All content you create, upload or share on the Service (“Content”) belongs to you. You are responsible for the legality of your Content and for ensuring it does not infringe the rights of third parties.",
        `All rights to your Content remain with you. ${BRAND_COMPANY} has the right to host and process your Content to the extent necessary to provide and operate the Service; beyond that, it claims no ownership over your Content.`,
      ],
    },
    {
      h: "Prohibited Uses",
      p: ["You may use the Service only for lawful purposes. You agree not to:"],
      ul: [
        "Use the Service in violation of any applicable national or international law.",
        "Harass, threaten, defraud or harm others.",
        "Attempt to gain unauthorized access to the Service, servers or connected systems.",
        "Distribute viruses, trojans, worms or any other malicious software.",
        "Engage in conduct that disrupts or overloads the normal operation of the Service (for example, denial-of-service attacks).",
      ],
    },
    {
      h: "Intellectual Property",
      p: [
        `Except for User Content, the original content, features and functionality of the Service are owned by ${BRAND_COMPANY} and its licensors and are protected by intellectual property law. Our trademarks and trade dress may not be used without our prior written permission.`,
        `${BRAND_NAME} is built upon open-source software released under the AGPL-3.0 license; the relevant open-source license is reserved.`,
      ],
    },
    {
      h: "Disclaimer of Warranties",
      p: [
        `The Service is provided “as is” and “as available”. To the maximum extent permitted by applicable law, ${BRAND_COMPANY} makes no express or implied warranty that the Service will be uninterrupted, error-free or fit for a particular purpose.`,
      ],
    },
    {
      h: "Limitation of Liability",
      p: [
        `To the maximum extent permitted by applicable law, ${BRAND_COMPANY} shall not be liable for any indirect, incidental, special or consequential damages arising from the use of or inability to use the Service.`,
      ],
    },
    {
      h: "Termination",
      p: [
        "We may suspend or terminate access to your account for good cause, including breach of the Terms, without prior notice. You may terminate your account at any time by ceasing to use the Service.",
      ],
    },
    {
      h: "Governing Law",
      p: [
        "These Terms are governed by and construed in accordance with the laws of the Republic of Türkiye. The courts and enforcement offices of the Republic of Türkiye have jurisdiction over disputes arising from the Terms.",
      ],
    },
    {
      h: "Changes to the Terms",
      p: [
        "We may update the Terms from time to time. Updated Terms are published on this page. Continuing to use the Service after changes means you accept the current Terms.",
      ],
    },
    {
      h: "Contact",
      p: [
        "For questions about these Terms of Service, you can reach us at {email}.",
      ],
    },
  ],
};

export default function TermsView() {
  return <LegalDoc tr={tr} en={en} />;
}
