"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { fromDateInputValue } from "@/lib/formatting/date";
import { documentFormSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";

export async function saveDocumentAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("settings", "edit");
  const parsed = documentFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    category: formData.get("category") ?? "OTHER",
    expiryDate: formData.get("expiryDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }

  const data = {
    name: parsed.data.name,
    category: parsed.data.category || "OTHER",
    expiryDate: parsed.data.expiryDate ? fromDateInputValue(parsed.data.expiryDate) : null,
    notes: parsed.data.notes || null,
  };

  try {
    if (parsed.data.id) {
      await prisma.companyDocument.updateMany({
        where: { id: parsed.data.id, ...companyScope(user.companyId) },
        data,
      });
    } else {
      const created = await prisma.companyDocument.create({
        data: { companyId: user.companyId, ...data },
      });
      await writeAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "create",
        module: "documents",
        recordId: created.id,
        newValue: data,
      });
    }
  } catch (error) {
    console.error("saveDocumentAction", error);
    return failState();
  }

  await revalidateApp(["/documents"]);
  return okState();
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requirePermission("settings", "edit");
  const id = String(formData.get("id") ?? "");
  await prisma.companyDocument.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/documents"]);
}
