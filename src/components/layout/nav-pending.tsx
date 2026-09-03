"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

type NavPendingContextValue = {
  pathname: string;
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
};

const NavPendingContext = createContext<NavPendingContextValue>({
  pathname: "/",
  pendingHref: null,
  setPendingHref: () => {},
});

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const value = useMemo(
    () => ({ pathname, pendingHref, setPendingHref }),
    [pathname, pendingHref],
  );

  return <NavPendingContext.Provider value={value}>{children}</NavPendingContext.Provider>;
}

export function useNavPending() {
  return useContext(NavPendingContext);
}

export function navItemActive(pathname: string, href: string, pendingHref: string | null) {
  if (pendingHref) return pendingHref === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
