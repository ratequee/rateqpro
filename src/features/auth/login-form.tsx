"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: LoginState = {};

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <div
          className="mb-3 flex items-center gap-1.5 rounded-lg border border-er-border bg-er-bg px-3 py-2 text-[12.5px] text-er-fg"
          role="alert"
        >
          {t(
            state.error === "invalid"
              ? "invalidCredentials"
              : state.error === "inactive"
                ? "inactive"
                : state.error === "rateLimited"
                  ? "rateLimited"
                  : "error",
          )}
        </div>
      ) : null}
      <div>
        <Label htmlFor="email" className="mb-1.5 block">
          {t("email")}
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-light" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            className="h-11 w-full rounded-[9px] border border-border bg-muted pe-3 ps-9 text-sm text-foreground placeholder:text-ink-light focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5 block">
          {t("password")}
        </Label>
        <div className="relative">
          <button
            type="button"
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-light"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Lock className="size-4" />}
          </button>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            className="h-11 w-full rounded-[9px] border border-border bg-muted pe-3 ps-9 text-sm text-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none"
          />
        </div>
      </div>
      <Button type="submit" className="mt-1.5 h-12 w-full rounded-[9px] text-[15px]" disabled={pending}>
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className={cn("size-4 animate-spin")} />
            {t("submitting")}
          </span>
        ) : (
          t("submit")
        )}
      </Button>
      <div className="mt-4 rounded-[9px] border border-border bg-muted p-2.5 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        <b>{t("demoTitle")}</b>
        <br />
        oscar.d@example.net
        <br />
        {t("demoPassword")}: RateQPro!Demo
      </div>
    </form>
  );
}
