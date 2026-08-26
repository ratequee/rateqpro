"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { assetFormSchema, cashAdvanceFormSchema } from "@/lib/validation/records";
import { failState, nextCodedValue, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveAssetAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("assets", "create");
  const parsed = assetFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    category: formData.get("category") ?? "OTHER",
    purchaseDate: formData.get("purchaseDate") ?? "",
    purchaseValue: formData.get("purchaseValue"),
    currentValue: formData.get("currentValue") ?? "",
    status: formData.get("status") ?? "ACTIVE",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const value = parsed.data.currentValue || parsed.data.purchaseValue;
  const data = {
    name: parsed.data.name,
    category: parsed.data.category,
    purchaseDate: parsed.data.purchaseDate ? fromDateInputValue(parsed.data.purchaseDate) : null,
    purchaseValue: parsed.data.purchaseValue,
    currentValue: value,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  };

  try {
    if (parsed.data.id) {
      const existing = await prisma.asset.findFirst({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
      });
      if (!existing) {
        return failState();
      }
      await prisma.asset.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.asset.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "assets",
        recordId: created.id,
        newValue: { name: created.name, purchaseValue: parsed.data.purchaseValue },
      });
    }
  } catch (error) {
    console.error("saveAssetAction", error);
    return failState();
  }

  await revalidateApp(["/assets", "/dashboard"]);
  return okState();
}

export async function saveCashAdvanceAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("cashAdvances", "create");
  const parsed = cashAdvanceFormSchema.safeParse({
    id: formData.get("id") ?? "",
    personName: formData.get("personName"),
    amountIssued: formData.get("amountIssued"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  try {
    const data = {
      personName: parsed.data.personName,
      amountIssued: parsed.data.amountIssued,
      issueDate: fromDateInputValue(parsed.data.issueDate),
      dueDate: parsed.data.dueDate ? fromDateInputValue(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
    };
    if (parsed.data.id) {
      await prisma.cashAdvance.updateMany({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
        data,
      });
    } else {
      const last = await prisma.cashAdvance.findFirst({
        where: companyScope(user.companyId),
        orderBy: { createdAt: "desc" },
        select: { number: true },
      });
      const created = await prisma.cashAdvance.create({
        data: {
          companyId: user.companyId,
          number: nextCodedValue(last?.number, "CA"),
          status: "OPEN",
          ...data,
        },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "cash-advances",
        recordId: created.id,
        newValue: { personName: created.personName, amountIssued: parsed.data.amountIssued },
      });
    }
  } catch (error) {
    console.error("saveCashAdvanceAction", error);
    return failState();
  }

  await revalidateApp(["/assets", "/cash-advances", "/dashboard"]);
  return okState();
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const user = await requirePermission("assets", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.asset.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/assets", "/dashboard"]);
}

export async function deleteCashAdvanceAction(formData: FormData): Promise<void> {
  const user = await requirePermission("cashAdvances", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.cashAdvance.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/assets", "/cash-advances", "/dashboard"]);
}

export async function settleCashAdvanceAction(formData: FormData): Promise<void> {
  const user = await requirePermission("cashAdvances", "edit");
  const id = String(formData.get("id") ?? "");
  await prisma.cashAdvance.updateMany({
    where: { id, ...companyScope(user.companyId) },
    data: { status: "SETTLED" },
  });
  await revalidateApp(["/assets", "/cash-advances", "/dashboard"]);
}
