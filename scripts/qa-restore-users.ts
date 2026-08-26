import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { name: true, email: true, status: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
