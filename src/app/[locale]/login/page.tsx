import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandLogo } from "@/components/brand/logo";
import { LoginForm } from "@/features/auth/login-form";
import { Suspense } from "react";
import type { AppLocale } from "@/i18n/routing";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="mb-8 flex flex-col items-start gap-4">
          <BrandLogo priority className="h-8 w-auto" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
