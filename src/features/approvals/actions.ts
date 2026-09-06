"use server";

import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { writeAuditLog } from "@/lib/audit/write";
import { revalidateApp } from "@/features/records/helpers";
import { markSourceMovementStatus } from "@/lib/finance/source-posting";
import { applyEmployeeRequest } from "@/lib/finance/change-requests";

async function touch() {
  await revalidateApp(["/approvals", "/transactions", "/bank-accounts", "/employees", "/salary", "/dashboard", "/expenses"]);
}

export async function approveBankTransactionAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  if (existing) {
    await markSourceMovementStatus(user.companyId, existing.id, "POSTED");
  }
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "approve",
    module: "transactions",
    recordId: id,
  });
  await touch();
}

export async function rejectBankTransactionAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.bankTransaction.findFirst({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  if (existing) {
    await markSourceMovementStatus(user.companyId, existing.id, "VOIDED");
  }
  await touch();
}

export async function approveCardTransactionAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const linked = await prisma.bankTransaction.findFirst({
    where: { creditCardTransactionId: id, ...companyScope(user.companyId) },
  });
  if (linked) {
    await markSourceMovementStatus(user.companyId, linked.id, "POSTED");
  } else {
    await prisma.creditCardTransaction.updateMany({
      where: { id, ...companyScope(user.companyId), status: "PENDING" },
      data: { status: "POSTED" },
    });
  }
  await touch();
}

export async function rejectCardTransactionAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const linked = await prisma.bankTransaction.findFirst({
    where: { creditCardTransactionId: id, ...companyScope(user.companyId) },
  });
  if (linked) {
    await markSourceMovementStatus(user.companyId, linked.id, "VOIDED");
  } else {
    await prisma.creditCardTransaction.updateMany({
      where: { id, ...companyScope(user.companyId), status: "PENDING" },
      data: { status: "VOIDED" },
    });
  }
  await touch();
}

export async function approveExpenseAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.expense.findFirst({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  if (existing?.transactionId) {
    await markSourceMovementStatus(user.companyId, existing.transactionId, "POSTED");
  } else if (existing) {
    await prisma.expense.update({
      where: { id: existing.id },
      data: { status: "POSTED" },
    });
  }
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "approve",
    module: "expenses",
    recordId: id,
  });
  await touch();
}

export async function rejectExpenseAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.expense.findFirst({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  if (existing?.transactionId) {
    await markSourceMovementStatus(user.companyId, existing.transactionId, "VOIDED");
  } else if (existing) {
    await prisma.expense.update({
      where: { id: existing.id },
      data: { status: "VOIDED", voidedAt: new Date() },
    });
  }
  await touch();
}

export async function approvePayrollAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.payroll.updateMany({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
    data: { status: "POSTED" },
  });
  await touch();
}

export async function rejectPayrollAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.payroll.deleteMany({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  await touch();
}

export async function approveChangeRequestAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const request = await prisma.approvalRequest.findFirst({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
  });
  if (!request) return;

  if (request.module === "employees") {
    await applyEmployeeRequest({
      action: request.action,
      companyId: user.companyId,
      targetId: request.targetId,
      payload: request.payload,
    });
  }

  await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  await writeAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "approve",
    module: request.module,
    recordId: request.targetId ?? request.id,
    newValue: { requestId: request.id, requestAction: request.action },
  });
  await touch();
}

export async function rejectChangeRequestAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.approvalRequest.updateMany({
    where: { id, ...companyScope(user.companyId), status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  await touch();
}
