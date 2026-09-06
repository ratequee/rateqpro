import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";
import { NavPendingProvider } from "./nav-pending";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppShell({
  user,
  alertCount,
  unreadAlerts,
  children,
}: {
  user: CurrentUser;
  alertCount: Promise<number>;
  unreadAlerts: Promise<number>;
  children: ReactNode;
}) {
  return (
    <NavPendingProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-[226px] lg:flex lg:flex-col">
          <Sidebar user={user} alertCount={alertCount} unreadAlerts={unreadAlerts} />
        </aside>
        <div className="lg:ps-[226px]">
          <AppHeader user={user} alertCount={alertCount} unreadAlerts={unreadAlerts} />
          <main className="flex flex-col gap-3.5 px-5 py-[18px]">{children}</main>
        </div>
      </div>
    </NavPendingProvider>
  );
}
