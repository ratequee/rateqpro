import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { AppHeader } from "./app-header";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <Sidebar />
      </aside>
      <div className="lg:ps-64">
        <AppHeader user={user} />
        <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
