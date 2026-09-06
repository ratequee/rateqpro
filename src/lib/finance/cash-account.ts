import { prisma } from "@/lib/db/prisma";

export async function ensureCashAccount(companyId: string) {
  const existing = await prisma.bankAccount.findFirst({
    where: { companyId, name: "Cash", isActive: true },
  });
  if (existing) return existing;
  return prisma.bankAccount.create({
    data: {
      companyId,
      name: "Cash",
      bankName: "Cash",
      isPrimary: false,
    },
  });
}
