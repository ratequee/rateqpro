import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { DocumentLocale } from "@/components/layout/document-locale";
import { AppToaster } from "@/components/ui/toaster";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as AppLocale,
    namespace: "metadata",
  });
  return {
    title: t("title"),
    description: t("description"),
    icons: { icon: "/brand/favicon.svg" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as AppLocale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <DocumentLocale />
      {children}
      <AppToaster />
    </NextIntlClientProvider>
  );
}
