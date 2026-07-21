import Link from "next/link";
import { t } from "@lingui/core/macro";
import { FaGithub } from "react-icons/fa";

import { LanguageSelector } from "~/components/LanguageSelector";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_LICENSE_URL,
  BRAND_NAME,
  BRAND_SOURCE_URL,
} from "~/lib/brand";

const SOURCE_CODE_URL = BRAND_SOURCE_URL;
const LICENSE_URL = BRAND_LICENSE_URL;

const Footer = () => {
  const navigation = {
    product: [
      { name: t`Features`, href: "/#features" },
      { name: t`SSS`, href: "/#faq" },
    ],
    start: [
      { name: t`Giriş yap`, href: "/login" },
      { name: t`Hesap oluştur`, href: "/signup" },
    ],
    company: [
      { name: t`Contact`, href: `mailto:${BRAND_CONTACT_EMAIL}` },
      { name: t`Kaynak kodu`, href: SOURCE_CODE_URL },
    ],
    legal: [
      { name: t`Terms of service`, href: "/terms" },
      { name: t`Privacy policy`, href: "/privacy" },
      { name: t`License`, href: LICENSE_URL },
    ],
  };

  return (
    <footer className="z-10 w-full border-t border-light-300 bg-light-50 py-8 dark:border-dark-300 dark:bg-dark-50">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8 lg:py-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
                {BRAND_NAME}
              </span>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <Link href={SOURCE_CODE_URL} target="_blank" aria-label={t`Source code`}>
                <FaGithub aria-hidden="true" className="h-8 w-8 rounded-lg border border-light-300 p-1.5 text-light-1000 hover:bg-light-100 dark:border-dark-300 dark:text-dark-1000 dark:hover:bg-dark-100" />
              </Link>
            </div>
            <LanguageSelector />
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm/6 font-semibold text-light-1000 dark:text-dark-1000">
                  {t`Ürün`}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.product.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm/6 text-light-900 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mt-10 text-sm/6 font-semibold text-light-1000 dark:text-dark-1000 md:mt-0">
                  {t`Company`}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm/6 text-light-900 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm/6 font-semibold text-light-1000 dark:text-dark-1000">
                  {t`Başlayın`}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.start.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm/6 text-light-900 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mt-10 text-sm/6 font-semibold text-light-1000 dark:text-dark-1000 md:mt-0">
                  {t`Legal`}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm/6 text-light-900 hover:text-light-1000 dark:text-dark-950 dark:hover:text-dark-1000"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
