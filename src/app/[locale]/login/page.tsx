import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand/mark";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { LoginForm } from "@/features/auth/login-form";
import { Suspense } from "react";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-linear-to-br from-primary-deep to-primary px-10 py-9 lg:flex">
        <div
          className="pointer-events-none absolute -end-20 -top-20 size-[220px] rounded-full bg-white/5"
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <BrandMark className="size-[38px] rounded-[10px]" />
          <div>
            <div className="text-base font-bold text-white">RateQ Pro</div>
            <div className="text-[10px] text-white/45">{t("productTag")}</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="mb-3 text-[26px] font-bold leading-snug text-white">
            {t("heroTitleLine1")}
            <br />
            {t("heroTitleLine2")}
          </h1>
          <p className="mb-5 text-[12.5px] leading-relaxed text-white/60">
            {t("heroBody")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {(["bullet1", "bullet2", "bullet3", "bullet4"] as const).map((key) => (
              <li
                key={key}
                className="flex items-center gap-2.5 text-xs text-white/70"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-gold-bright" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11px] text-white/40">
          RateQ Digital Solutions
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center bg-card px-5 py-10 sm:px-12 lg:px-[52px]">
        <div className="mb-5 flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <h2 className="mb-1 text-[22px] font-bold">{t("welcomeBack")}</h2>
          <p className="mb-5 text-[13px] text-muted-foreground">{t("subtitle")}</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
