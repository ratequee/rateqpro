import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { AppLocale } from "@/i18n/routing";

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  redirect({ href: user ? "/dashboard" : "/login", locale: locale as AppLocale });
}
