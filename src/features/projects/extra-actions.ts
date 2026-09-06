"use server";

import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { fromDateInputValue } from "@/lib/formatting/date";
import { projectPaymentSchema } from "@/lib/validation/records";
import { failState, okState, revalidateApp } from "@/features/records/helpers";
import type { RecordActionState } from "@/features/records/state";
import {
  attachmentStorageKey,
  isAllowedAttachment,
  uploadPrivateAttachment,
} from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function saveProjectPaymentAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("projects", "edit");
  const parsed = projectPaymentSchema.safeParse({
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return failState();
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...companyScope(user.companyId) },
  });
  if (!project) return failState();
  try {
    await prisma.projectPayment.create({
      data: {
        companyId: user.companyId,
        projectId: project.id,
        amount: parsed.data.amount,
        dueDate: fromDateInputValue(parsed.data.dueDate),
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    console.error("saveProjectPaymentAction", error);
    return failState();
  }
  await revalidateApp(["/projects", "/notifications"]);
  return okState();
}

export async function saveProjectDocumentAction(
  _prev: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const user = await requirePermission("projects", "edit");
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || name.length < 2) return failState();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...companyScope(user.companyId) },
  });
  if (!project) return failState();
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) {
    return failState();
  }
  if (!isSupabaseConfigured() || !isAllowedAttachment(file.type, file.size)) {
    return failState();
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const storageKey = attachmentStorageKey({
      companyId: user.companyId,
      ownerType: "projects",
      ownerId: project.id,
      fileName: file.name,
    });
    await uploadPrivateAttachment({ storageKey, bytes, mimeType: file.type });
    await prisma.attachment.create({
      data: {
        companyId: user.companyId,
        ownerType: "PROJECT",
        ownerId: project.id,
        fileName: name || file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
      },
    });
  } catch (error) {
    console.error("saveProjectDocumentAction", error);
    return failState();
  }
  await revalidateApp(["/projects"]);
  return okState();
}
