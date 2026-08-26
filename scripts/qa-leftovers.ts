import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const company = await prisma.company.findFirst({
    where: { slug: "noor-al-qatar-demo" },
  });
  if (!company) {
    throw new Error("demo company missing");
  }
  const id = company.id;
  const data = {
    clients: await prisma.client.findMany({
      where: { companyId: id },
      select: { name: true },
    }),
    documents: await prisma.companyDocument.findMany({
      where: { companyId: id },
      select: { name: true },
    }),
    obligations: await prisma.obligation.findMany({
      where: { companyId: id },
      select: { name: true, status: true },
    }),
    employees: await prisma.employee.findMany({
      where: { companyId: id },
      select: { name: true },
    }),
    expenses: await prisma.expense.findMany({
      where: { companyId: id },
      select: { description: true, kind: true },
    }),
    users: await prisma.user.findMany({
      where: { companyId: id },
      select: { name: true, email: true, status: true },
    }),
  };
  console.log(JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
