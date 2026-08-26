import "dotenv/config";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { PERMISSION_CATALOG } from "../src/lib/permissions/catalog";
import { permissionsForRole } from "../src/lib/permissions/check";

const DEMO_PASSWORD = "RateQPro!Demo";

async function main() {
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userNotificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.companyDocument.deleteMany();
  await prisma.payrollAllocation.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.cashAdvanceSettlement.deleteMany();
  await prisma.cashAdvance.deleteMany();
  await prisma.creditCardTransaction.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.obligation.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.subscriptionPlan.deleteMany();

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.create({
      data: {
        key: permission.key,
        module: permission.module,
        action: permission.action,
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(permissions.map((item) => [item.key, item.id]));

  const roles: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];
  for (const role of roles) {
    const keys = permissionsForRole(role);
    for (const key of keys) {
      const permissionId = permissionByKey.get(key);
      if (!permissionId) {
        continue;
      }
      await prisma.rolePermission.create({
        data: { role, permissionId },
      });
    }
  }

  const trialPlan = await prisma.subscriptionPlan.create({
    data: {
      code: "trial",
      name: "Trial",
      monthlyPrice: 0,
      maxUsers: 10,
      maxProjects: 25,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "Noor Al-Qatar Contracting",
      slug: "noor-al-qatar-demo",
      email: "oscar.d@example.net",
      phone: "+974 4444 1100",
      address: "Lusail, Doha, Qatar",
      currencyCode: "QAR",
      dateFormat: "dd/MM/yyyy",
      locale: "en",
      timezone: "Asia/Qatar",
      isDemo: true,
    },
  });

  await prisma.subscription.create({
    data: {
      companyId: company.id,
      planId: trialPlan.id,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = [
    {
      email: "oscar.d@example.net",
      name: "Sara Al-Thani",
      role: "SUPER_ADMIN" as const,
    },
    {
      email: "emma.t@example.net",
      name: "Omar Al-Kuwari",
      role: "ADMIN" as const,
    },
    {
      email: "bob.m@example.net",
      name: "Layla Hassan",
      role: "MANAGER" as const,
    },
    {
      email: "xena.w@example.org",
      name: "Yousef Mansour",
      role: "EMPLOYEE" as const,
    },
  ];

  const createdUsers = [];
  for (const user of users) {
    const created = await prisma.user.create({
      data: {
        companyId: company.id,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        status: "ACTIVE",
      },
    });
    createdUsers.push(created);

    await prisma.userNotificationPreference.create({
      data: {
        companyId: company.id,
        userId: created.id,
      },
    });
  }

  const admin = createdUsers[0];
  if (!admin) {
    throw new Error("Failed to seed admin user");
  }

  const bankAccount = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      name: "QNB Operating Account",
      bankName: "Qatar National Bank",
      accountNo: "**** 4401",
      isPrimary: true,
    },
  });

  const hamad = await prisma.client.create({
    data: {
      companyId: company.id,
      name: "Hamad Al-Attiyah",
      phone: "+974 5555 2210",
      notes: "Demo client — Lusail villa owner",
    },
  });

  const noor = await prisma.client.create({
    data: {
      companyId: company.id,
      name: "Noor Interiors WLL",
      email: "projects@noorinteriors.qa",
      notes: "Demo client — Al Wakrah fit-out",
    },
  });

  const lusail = await prisma.project.create({
    data: {
      companyId: company.id,
      clientId: hamad.id,
      code: "LUS-24",
      name: "Lusail Residential Villa",
      contractValue: "450000",
      startDate: new Date("2024-11-01"),
      endDate: new Date("2026-03-31"),
      status: "ACTIVE",
      notes: "Demo project",
    },
  });

  const wakrah = await prisma.project.create({
    data: {
      companyId: company.id,
      clientId: noor.id,
      code: "WAK-24",
      name: "Al Wakrah Interior Fit-out",
      contractValue: "210000",
      startDate: new Date("2025-01-15"),
      endDate: new Date("2026-06-30"),
      status: "ACTIVE",
      notes: "Demo project",
    },
  });

  await prisma.project.create({
    data: {
      companyId: company.id,
      code: "EDU-23",
      name: "Education City Maintenance",
      contractValue: "86000",
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-08-31"),
      status: "COMPLETED",
      notes: "Demo project",
    },
  });

  await prisma.contract.create({
    data: {
      companyId: company.id,
      projectId: lusail.id,
      clientId: hamad.id,
      number: "CNT-LUS-001",
      value: "450000",
      contractDate: new Date("2024-10-20"),
      startDate: new Date("2024-11-01"),
      endDate: new Date("2026-03-31"),
      paymentTerms: "30% advance, 40% at structure, 30% on handover",
    },
  });

  const movements = [
    {
      reference: "TX-00001",
      date: "2026-03-04",
      type: "DEPOSIT" as const,
      amount: "180000.00",
      description: "Advance payment — Lusail villa",
      category: "project_payment",
      projectId: lusail.id,
    },
    {
      reference: "TX-00002",
      date: "2026-04-12",
      type: "DEPOSIT" as const,
      amount: "95000.00",
      description: "Progress payment — Al Wakrah fit-out",
      category: "project_payment",
      projectId: wakrah.id,
    },
    {
      reference: "TX-00003",
      date: "2026-05-02",
      type: "WITHDRAWAL" as const,
      amount: "42000.00",
      description: "Marble and finishing materials — Lusail",
      category: "materials",
      projectId: lusail.id,
    },
    {
      reference: "TX-00004",
      date: "2026-05-18",
      type: "WITHDRAWAL" as const,
      amount: "18500.00",
      description: "Lusail office rent — May",
      category: "rent",
      projectId: null,
    },
    {
      reference: "TX-00005",
      date: "2026-06-01",
      type: "WITHDRAWAL" as const,
      amount: "32000.00",
      description: "Site staff salaries — May",
      category: "salaries",
      projectId: lusail.id,
    },
    {
      reference: "TX-00006",
      date: "2026-06-15",
      type: "WITHDRAWAL" as const,
      amount: "8400.00",
      description: "Material transport to Lusail",
      category: "transportation",
      projectId: lusail.id,
    },
    {
      reference: "TX-00007",
      date: "2026-07-10",
      type: "DEPOSIT" as const,
      amount: "75000.00",
      description: "Second installment — Lusail villa",
      category: "project_payment",
      projectId: lusail.id,
    },
    {
      reference: "TX-00008",
      date: "2026-08-01",
      type: "WITHDRAWAL" as const,
      amount: "12600.00",
      description: "Electrical works — Al Wakrah",
      category: "subcontractors",
      projectId: wakrah.id,
    },
  ];

  for (const movement of movements) {
    await prisma.bankTransaction.create({
      data: {
        companyId: company.id,
        bankAccountId: bankAccount.id,
        projectId: movement.projectId,
        reference: movement.reference,
        date: new Date(movement.date),
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
        category: movement.category,
        status: "POSTED",
        createdById: admin.id,
      },
    });
  }

  await prisma.obligation.createMany({
    data: [
      {
        companyId: company.id,
        name: "Lusail office rent",
        category: "RENT",
        amount: "18500",
        frequency: "MONTHLY",
        dueDate: new Date("2026-08-01"),
        nextDueDate: new Date("2026-09-01"),
        reminderDays: 7,
        status: "ACTIVE",
      },
      {
        companyId: company.id,
        name: "Pickup lease — Toyota Hilux",
        category: "VEHICLES",
        amount: "4200",
        frequency: "MONTHLY",
        dueDate: new Date("2026-08-10"),
        nextDueDate: new Date("2026-09-10"),
        reminderDays: 5,
        status: "ACTIVE",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo company: Noor Al-Qatar Contracting");
  console.log("Login: oscar.d@example.net / RateQPro!Demo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
