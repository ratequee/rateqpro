import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function writeAuditLog(input: {
  companyId: string;
  userId: string;
  action: string;
  module: string;
  recordId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
    },
  });
}
