import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const alertCount = await prisma.obligation.count({
    where: {
      ...companyScope(user.companyId),
      status: "ACTIVE",
      nextDueDate: { lt: new Date() },
    },
  });
  return (
    <AppShell user={user} alertCount={alertCount}>
      {children}
    </AppShell>
  );
}
