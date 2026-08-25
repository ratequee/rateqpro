"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import {
  clearLoginFailures,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/auth";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

function safeNextPath(raw: string): "/dashboard" | (string & {}) {
  let path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/dashboard";
  }
  for (const locale of routing.locales) {
    if (path === `/${locale}`) {
      return "/dashboard";
    }
    if (path.startsWith(`/${locale}/`)) {
      path = path.slice(locale.length + 1);
    }
  }
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (path === "/" || path === "/login") {
    return "/dashboard";
  }
  return path;
}

export type LoginState = {
  error?: "invalid" | "inactive" | "rateLimited" | "generic";
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: "invalid" };
    }

    const requestHeaders = await headers();
    const ip =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      "unknown";
    const rateKey = `${ip}:${parsed.data.email.toLowerCase()}`;

    if (isLoginRateLimited(rateKey)) {
      return { error: "rateLimited" };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!user) {
      recordLoginFailure(rateKey);
      return { error: "invalid" };
    }

    const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      recordLoginFailure(rateKey);
      return { error: "invalid" };
    }

    if (user.status !== "ACTIVE") {
      return { error: "inactive" };
    }

    clearLoginFailures(rateKey);
    await createSession({
      userId: user.id,
      companyId: user.companyId,
      ipAddress: ip,
      userAgent: requestHeaders.get("user-agent"),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "login",
        module: "users",
        recordId: user.id,
        ipAddress: ip,
      },
    });
  } catch (error) {
    console.error("loginAction", error);
    return { error: "generic" };
  }

  const locale = await getLocale();
  const nextPath = safeNextPath(String(formData.get("next") ?? "/dashboard"));
  redirect({ href: nextPath, locale });
  return {};
}

export async function logoutAction(): Promise<void> {
  const locale = await getLocale();
  await destroySession();
  redirect({ href: "/login", locale });
}
