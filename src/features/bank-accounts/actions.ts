"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { bankAccountFormSchema, creditCardFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveBankAccountAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("transactions", "create");
  const parsed = bankAccountFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    bankName: formData.get("bankName") ?? "",
    accountNo: formData.get("accountNo") ?? "",
    isPrimary: formData.get("isPrimary") === "on" ? "true" : "false",
  });
  if (!parsed.success) {
    return failState();
  }

  try {
    const data = {
      name: parsed.data.name,
      bankName: parsed.data.bankName || null,
      accountNo: parsed.data.accountNo || null,
      isPrimary: parsed.data.isPrimary === "true",
    };
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: companyScope(user.companyId),
        data: { isPrimary: false },
      });
    }
    if (parsed.data.id) {
      const existing = await prisma.bankAccount.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.bankAccount.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.bankAccount.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "bank-accounts",
        recordId: created.id,
        newValue: data,
      });
    }
  } catch (error) {
    console.error("saveBankAccountAction", error);
    return failState();
  }

  await revalidateApp(["/bank-accounts", "/transactions", "/dashboard"]);
  return okState();
}

export async function saveCreditCardAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("creditCards", "create");
  const parsed = creditCardFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    last4: formData.get("last4") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  try {
    const data = {
      name: parsed.data.name,
      last4: parsed.data.last4 || null,
    };
    if (parsed.data.id) {
      await prisma.creditCard.updateMany({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
        data,
      });
    } else {
      const created = await prisma.creditCard.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "credit-cards",
        recordId: created.id,
        newValue: data,
      });
    }
  } catch (error) {
    console.error("saveCreditCardAction", error);
    return failState();
  }

  await revalidateApp(["/bank-accounts", "/credit-cards"]);
  return okState();
}

export async function deleteBankAccountAction(formData: FormData): Promise<void> {
  const user = await requirePermission("transactions", "delete");
  const id = String(formData.get("id") ?? "");
  const count = await prisma.bankTransaction.count({
    where: { bankAccountId: id, ...companyScope(user.companyId) },
  });
  if (count > 0) {
    await prisma.bankAccount.updateMany({
      where: { id, ...companyScope(user.companyId) },
      data: { isActive: false, isPrimary: false },
    });
  } else {
    await prisma.bankAccount.deleteMany({
      where: { id, ...companyScope(user.companyId) },
    });
  }
  await revalidateApp(["/bank-accounts", "/transactions", "/dashboard"]);
}

export async function deleteCreditCardAction(formData: FormData): Promise<void> {
  const user = await requirePermission("creditCards", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.creditCardTransaction.deleteMany({
    where: { creditCardId: id, ...companyScope(user.companyId) },
  });
  await prisma.creditCard.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/bank-accounts", "/credit-cards"]);
}
