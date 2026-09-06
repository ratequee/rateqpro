import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const scope = companyScope(user.companyId);
  const alertCount = prisma.bankTransaction.count({
    where: { ...scope, status: "PENDING" },
  });
  const unreadAlerts = prisma.notification.count({
    where: { ...scope, readAt: null },
  });
  return (
    <AppShell user={user} alertCount={alertCount} unreadAlerts={unreadAlerts}>
      {children}
    </AppShell>
  );
}
