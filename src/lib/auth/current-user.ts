import { cache } from "react";
import type { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSessionToken, hashToken } from "./session";
import { readSessionCache, writeSessionUser } from "./session-cache";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  companyId: string;
  companyName: string;
  currencyCode: string;
  dateFormat: string;
  image: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const cached = readSessionCache(tokenHash);
  if (cached) {
    if (!cached.valid) return null;
    if (cached.user) return cached.user;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              currencyCode: true,
              dateFormat: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
    writeSessionUser(tokenHash, null);
    return null;
  }

  const user: CurrentUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    status: session.user.status,
    companyId: session.user.companyId,
    companyName: session.user.company.name,
    currencyCode: session.user.company.currencyCode,
    dateFormat: session.user.company.dateFormat,
    image: session.user.image,
  };
  writeSessionUser(tokenHash, user);
  return user;
});
