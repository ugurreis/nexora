import Head from "next/head";

export const PageHead = ({ title }: { title: string }) => {
  return (
    <Head>
      <title>{title}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#10b981" />
      <link rel="apple-touch-icon" href="/icon-512.png" />
    </Head>
  );
};
