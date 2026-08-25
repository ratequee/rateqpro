"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/permissions/check";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  dateFormat: z.enum(["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"]),
});

export type SettingsState = { ok?: boolean; error?: boolean };

export async function updateCompanySettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: true };
  }
  if (!hasPermission(user.role, "settings", "edit")) {
    return { error: true };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateFormat: formData.get("dateFormat"),
  });

  if (!parsed.success) {
    return { error: true };
  }

  try {
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        dateFormat: parsed.data.dateFormat,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "update",
        module: "settings",
        recordId: user.companyId,
        newValue: parsed.data,
      },
    });
  } catch (error) {
    console.error("updateCompanySettings", error);
    return { error: true };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/settings`);
  revalidatePath(`/${locale}/dashboard`);
  return { ok: true };
}

export async function getCompanySettings() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      currencyCode: true,
      dateFormat: true,
      isDemo: true,
    },
  });
}
