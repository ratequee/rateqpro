import { createSupabaseAdmin } from "./admin";
import { isSupabaseConfigured, SUPABASE_ATTACHMENTS_BUCKET } from "./env";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedAttachment(mimeType: string, sizeBytes: number): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType) && sizeBytes > 0 && sizeBytes <= MAX_BYTES;
}

export async function ensureAttachmentsBucket(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.storage.getBucket(SUPABASE_ATTACHMENTS_BUCKET);
  if (data) {
    return;
  }
  const { error } = await supabase.storage.createBucket(SUPABASE_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

export function attachmentStorageKey(input: {
  companyId: string;
  ownerType: string;
  ownerId: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^\w.\-()\s\u0600-\u06FF]/g, "_");
  return `${input.companyId}/${input.ownerType}/${input.ownerId}/${Date.now()}-${safeName}`;
}

export async function uploadPrivateAttachment(input: {
  storageKey: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<void> {
  await ensureAttachmentsBucket();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage
    .from(SUPABASE_ATTACHMENTS_BUCKET)
    .upload(input.storageKey, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });
  if (error) {
    throw error;
  }
}

export async function downloadPrivateAttachment(storageKey: string): Promise<{
  bytes: ArrayBuffer;
  mimeType: string;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(SUPABASE_ATTACHMENTS_BUCKET)
    .download(storageKey);
  if (error || !data) {
    throw error ?? new Error("NOT_FOUND");
  }
  return {
    bytes: await data.arrayBuffer(),
    mimeType: data.type || "application/octet-stream",
  };
}

export async function deletePrivateAttachment(storageKey: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const supabase = createSupabaseAdmin();
  await supabase.storage.from(SUPABASE_ATTACHMENTS_BUCKET).remove([storageKey]);
}
