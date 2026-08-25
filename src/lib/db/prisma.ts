import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const hosted =
    /supabase/i.test(connectionString) ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("pooler.");

  return new Pool({
    connectionString,
    max: process.env.VERCEL ? 1 : 10,
    ssl: hosted ? { rejectUnauthorized: false } : undefined,
  });
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? createPool();
  globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
