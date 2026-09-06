"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { fromDateInputValue } from "@/lib/formatting/date";
import { employeeDocumentSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";
import {
  attachmentStorageKey,
  isAllowedAttachment,
  uploadPrivateAttachment,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function saveEmployeeDocumentAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("employees", "edit");
  const parsed = employeeDocumentSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    expiryDate: formData.get("expiryDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return failState();
  }
  if (parsed.data.kind === "EXPIRING" && !parsed.data.expiryDate) {
    return failState();
  }
  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, ...companyScope(user.companyId) },
  });
  if (!employee) {
    return failState();
  }

  try {
    const created = await prisma.employeeDocument.create({
      data: {
        companyId: user.companyId,
        employeeId: employee.id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        expiryDate: parsed.data.expiryDate ? fromDateInputValue(parsed.data.expiryDate) : null,
        notes: parsed.data.notes || null,
      },
    });
    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0 && isSupabaseConfigured() && isAllowedAttachment(file.type, file.size)) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const storageKey = attachmentStorageKey({
        companyId: user.companyId,
        ownerType: "employee-documents",
        ownerId: created.id,
        fileName: file.name,
      });
      await uploadPrivateAttachment({ storageKey, bytes, mimeType: file.type });
      await prisma.attachment.create({
        data: {
          companyId: user.companyId,
          ownerType: "EMPLOYEE_DOCUMENT",
          ownerId: created.id,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey,
        },
      });
    }
  } catch (error) {
    console.error("saveEmployeeDocumentAction", error);
    return failState();
  }

  await revalidateApp(["/employees", "/notifications"]);
  return okState();
}

export async function deleteEmployeeDocumentAction(formData: FormData) {
  const user = await requirePermission("employees", "delete");
  const id = String(formData.get("id") ?? "");
  await prisma.employeeDocument.deleteMany({
    where: { id, ...companyScope(user.companyId) },
  });
  await revalidateApp(["/employees"]);
}
