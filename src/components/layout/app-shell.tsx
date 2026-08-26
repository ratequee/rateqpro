import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppShell({
  user,
  alertCount = 0,
  children,
}: {
  user: CurrentUser;
  alertCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[226px] lg:flex lg:flex-col">
        <Sidebar user={user} alertCount={alertCount} />
      </aside>
      <div className="lg:ps-[226px]">
        <AppHeader user={user} alertCount={alertCount} />
        <main className="flex flex-col gap-3.5 px-5 py-[18px]">{children}</main>
      </div>
    </div>
  );
}
