import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./constants";
import { clearSessionCache, readSessionCache, writeSessionValidity } from "./session-cache";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(input: {
  userId: string;
  companyId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId: input.userId,
      companyId: input.companyId,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  return token;
}

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    clearSessionCache(tokenHash);
    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(new Date(0)));
}

export async function isValidSessionToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const cached = readSessionCache(tokenHash);
  if (cached) {
    return cached.valid;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: { select: { status: true } },
    },
  });

  const valid = Boolean(
    session && session.expiresAt > new Date() && session.user.status === "ACTIVE",
  );
  writeSessionValidity(tokenHash, valid);
  return valid;
}

export async function getSessionToken(): Promise<string | null> {
  await connection();
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}
