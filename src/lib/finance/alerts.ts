import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";

async function notifyOnce(input: {
  companyId: string;
  userId: string;
  recordId: string;
  type: "OVERDUE_OBLIGATION" | "DOCUMENT_EXPIRING" | "DOCUMENT_EXPIRED" | "PROJECT_PAYMENT_DUE";
  title: string;
  body: string;
  module: string;
}) {
  const exists = await prisma.notification.findFirst({
    where: {
      companyId: input.companyId,
      recordId: input.recordId,
      type: input.type,
      readAt: null,
    },
  });
  if (exists) return;
  await prisma.notification.create({ data: input });
}

export async function syncCompanyAlerts(companyId: string, userId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [overdue, documents, payments] = await Promise.all([
    prisma.obligation.findMany({
      where: { ...companyScope(companyId), status: "ACTIVE", nextDueDate: { lt: now } },
    }),
    prisma.employeeDocument.findMany({
      where: {
        ...companyScope(companyId),
        kind: "EXPIRING",
        expiryDate: { not: null, lte: soon },
      },
      include: { employee: { select: { name: true } } },
    }),
    prisma.projectPayment.findMany({
      where: { ...companyScope(companyId), paidAt: null, dueDate: { lte: soon } },
      include: { project: { select: { name: true, code: true } } },
    }),
  ]);

  for (const item of overdue) {
    await notifyOnce({
      companyId,
      userId,
      recordId: item.id,
      type: "OVERDUE_OBLIGATION",
      title: item.name,
      body: `Overdue obligation: ${item.name}`,
      module: "obligations",
    });
  }

  for (const doc of documents) {
    const expired = Boolean(doc.expiryDate && doc.expiryDate < now);
    await notifyOnce({
      companyId,
      userId,
      recordId: doc.id,
      type: expired ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING",
      title: `${doc.employee.name} · ${doc.name}`,
      body: expired ? `Document expired: ${doc.name}` : `Document expiring soon: ${doc.name}`,
      module: "employees",
    });
  }

  for (const payment of payments) {
    await notifyOnce({
      companyId,
      userId,
      recordId: payment.id,
      type: "PROJECT_PAYMENT_DUE",
      title: `${payment.project.code} · ${payment.project.name}`,
      body: `Project payment due: ${payment.amount.toString()}`,
      module: "projects",
    });
  }
}
