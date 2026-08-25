import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";

const intlMiddleware = createMiddleware(routing);

const publicPathnames = ["/login"];

function pathnameWithoutLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) {
      return "/";
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

function getLocaleFromPath(pathname: string): string {
  const maybeLocale = pathname.split("/")[1];
  if (maybeLocale && routing.locales.includes(maybeLocale as "en" | "ar")) {
    return maybeLocale;
  }
  return routing.defaultLocale;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const stripped = pathnameWithoutLocale(pathname);
  const isPublic = publicPathnames.some(
    (path) => stripped === path || stripped.startsWith(`${path}/`),
  );
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const locale = getLocaleFromPath(pathname);

  if (!isPublic && !hasSession) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", stripped === "/" ? "/dashboard" : stripped);
    return NextResponse.redirect(loginUrl);
  }

  if (stripped === "/login" && hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
