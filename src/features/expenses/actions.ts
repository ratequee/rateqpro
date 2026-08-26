"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { expenseFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";
import type { PermissionModule } from "@/lib/permissions/catalog";

function moduleForKind(kind: "PROJECT" | "OPERATING"): PermissionModule {
  return kind === "PROJECT" ? "expenses" : "operatingExpenses";
}

async function touch() {
  await revalidateApp(["/operating-expenses", "/project-expenses", "/reports", "/dashboard"]);
}

export async function saveExpenseAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const kind = formData.get("kind") === "PROJECT" ? "PROJECT" : "OPERATING";
  const user = await requirePermission(moduleForKind(kind), "create");
  const parsed = expenseFormSchema.safeParse({
    id: formData.get("id") ?? "",
    kind,
    projectId: formData.get("projectId") ?? "",
    date: formData.get("date"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const data = {
    kind: parsed.data.kind,
    projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId : null,
    date: fromDateInputValue(parsed.data.date),
    amount: parsed.data.amount,
    category: parsed.data.category,
    description: parsed.data.description,
    notes: parsed.data.notes || null,
  };

  try {
    if (parsed.data.id) {
      await prisma.expense.updateMany({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
        data,
      });
    } else {
      const created = await prisma.expense.create({
        data: {
          companyId: user.companyId,
          createdById: user.id,
          status: "POSTED",
          ...data,
        },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: kind === "PROJECT" ? "project-expenses" : "operating-expenses",
        recordId: created.id,
        newValue: data,
      });
    }
  } catch (error) {
    console.error("saveExpenseAction", error);
    return failState();
  }

  await touch();
  return okState();
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const kind = formData.get("kind") === "PROJECT" ? "PROJECT" : "OPERATING";
  const user = await requirePermission(moduleForKind(kind), "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.expense.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await touch();
}
