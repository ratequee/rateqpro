import type { RecordStatus, UserRole } from "@prisma/client";

export function initialRecordStatus(role: UserRole): RecordStatus {
  return role === "SUPER_ADMIN" ? "POSTED" : "PENDING";
}

export function isPendingStatus(status: RecordStatus) {
  return status === "PENDING";
}
