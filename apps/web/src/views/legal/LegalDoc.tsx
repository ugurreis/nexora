import { useEffect, useState } from "react";
import Link from "next/link";

import { PageHead } from "~/components/PageHead";
import { BRAND_CONTACT_EMAIL, BRAND_TITLE_SUFFIX } from "~/lib/brand";
import Layout from "../home/components/Layout";

export type LegalBlock = { h: string; p?: string[]; ul?: string[] };
export type LegalContent = {
  title: string;
  updated: string;
  blocks: LegalBlock[];
};

/**
 * Çift dilli (TR/EN) hukuk sayfası. Dil sinyali landing ile ortaktır:
 * localStorage["nexora_lang"]. Böylece landing'de EN seçilince bu sayfalar
 * da İngilizce açılır. Sağ üstteki düğme dili değiştirir ve kaydeder.
 * {email} ve {privacy} jetonları paragraf metninde link olarak render edilir.
 */
export function LegalDoc({
  tr,
  en,
}: {
  tr: LegalContent;
  en: LegalContent;
}) {
  const [lang, setLang] = useState<"tr" | "en">("tr");

  useEffect(() => {
    let l: string | null = null;
    try {
      l = localStorage.getItem("nexora_lang");
    } catch {
      l = null;
    }
    if (l !== "en" && l !== "tr") {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const nav = (navigator.language || "").toLowerCase();
        l = tz === "Europe/Istanbul" || nav.startsWith("tr") ? "tr" : "en";
      } catch {
        l = "tr";
      }
    }
    setLang(l as "tr" | "en");
  }, []);

  const doc = lang === "en" ? en : tr;
  const isEN = lang === "en";
  const privacyWord = isEN ? "Privacy Policy" : "Gizlilik Politikası";

  const toggle = () => {
    const next = lang === "en" ? "tr" : "en";
    setLang(next);
    try {
      localStorage.setItem("nexora_lang", next);
    } catch {
      /* yok say */
    }
  };

  const renderText = (text: string, key: number) => {
    // {email} ve {privacy} jetonlarını link olarak böl.
    const nodes: React.ReactNode[] = [];
    const re = /\{(email|privacy)\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      if (m[1] === "email") {
        nodes.push(
          <Link
            key={`e${key}-${i}`}
            className="text-light-1000 underline dark:text-dark-900"
            href={`mailto:${BRAND_CONTACT_EMAIL}`}
          >
            {BRAND_CONTACT_EMAIL}
          </Link>,
        );
      } else {
        nodes.push(
          <Link key={`p${key}-${i}`} className="underline" href="/privacy">
            {privacyWord}
          </Link>,
        );
      }
      last = m.index + m[0].length;
      i++;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  };

  return (
    <Layout>
      <PageHead title={`${doc.title} | ${BRAND_TITLE_SUFFIX}`} />
      <div className="flex flex-col items-center">
        <div className="mb-20 flex h-full w-full max-w-[800px] flex-col lg:pt-[5rem]">
          <div className="flex items-center justify-end pt-8">
            <button
              onClick={toggle}
              aria-label={isEN ? "Türkçeye geç" : "Switch to English"}
              className="rounded-lg border border-light-300 bg-light-50 px-3 py-1.5 text-sm font-bold text-light-900 hover:border-light-600 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900"
            >
              {isEN ? "TR" : "EN"}
            </button>
          </div>
          <div className="flex items-center justify-center py-24 text-4xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
            <h2>{doc.title}</h2>
          </div>
          <p className="mb-6 text-sm text-light-1000 dark:text-dark-900">
            {doc.updated}
          </p>

          {doc.blocks.map((b, bi) => (
            <div className="mb-6" key={bi}>
              <h3 className="mb-4 text-2xl font-bold text-light-1000 dark:text-dark-950">
                {b.h}
              </h3>
              {b.p?.map((para, pi) => (
                <p
                  className="line-height text-md mb-4 text-light-1000 dark:text-dark-900"
                  key={pi}
                >
                  {renderText(para, bi * 100 + pi)}
                </p>
              ))}
              {b.ul && (
                <ul className="list-disc pl-6">
                  {b.ul.map((li, li2) => (
                    <li
                      className="line-height text-md mb-4 text-light-1000 dark:text-dark-900"
                      key={li2}
                    >
                      {renderText(li, bi * 1000 + li2)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
