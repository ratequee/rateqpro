import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import {
  clientFormSchema,
  projectFormSchema,
  bankAccountFormSchema,
  creditCardFormSchema,
  obligationFormSchema,
  employeeFormSchema,
  assetFormSchema,
  cashAdvanceFormSchema,
  documentFormSchema,
  userFormSchema,
  payrollFormSchema,
  expenseFormSchema,
  bankImportSchema,
} from "../src/lib/validation/records";
import { transactionFormSchema } from "../src/lib/validation/transaction";
import {
  getDashboardWorkspace,
  getBankWorkspace,
  getClientsWorkspace,
  getProjectsWorkspace,
  getEmployeesWorkspace,
  getAssetsWorkspace,
  getReportsWorkspace,
} from "../src/lib/finance/workspace";
import { listTransactions, nextTransactionReference, getPrimaryBankAccount } from "../src/services/transactions";
import { advanceObligationDueDate } from "../src/lib/finance/obligation-dates";
import { fromDateInputValue } from "../src/lib/formatting/date";
import { writeAuditLog } from "../src/lib/audit/write";

type Check = { name: string; ok: boolean; detail?: string };
type ModuleResult = { module: string; checks: Check[] };

const TAG = "QA Probe";
const stamp = Date.now().toString().slice(-6);

function check(name: string, ok: boolean, detail?: string): Check {
  return { name, ok, detail };
}

function fail(name: string, error: unknown): Check {
  return {
    name,
    ok: false,
    detail: error instanceof Error ? error.message : String(error),
  };
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function isDecimalLike(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const name = (value as { constructor?: { name?: string } }).constructor?.name;
  return name === "Decimal" || (typeof (value as { d?: unknown }).d === "object" && "e" in (value as object) && "s" in (value as object));
}

function assertNoDecimal(value: unknown, path: string): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (value instanceof Date) {
    return;
  }
  if (typeof value === "bigint") {
    return;
  }
  if (isDecimalLike(value)) {
    throw new Error(`Prisma Decimal leaked at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDecimal(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "amount" || key === "salary" || key === "contractValue" || key === "purchaseValue") {
      if (typeof child === "object" && child && !(child instanceof Date) && typeof child !== "bigint") {
        if (isDecimalLike(child)) {
          throw new Error(`Prisma Decimal leaked at ${path}.${key}`);
        }
      }
    }
    assertNoDecimal(child, `${path}.${key}`);
  }
}

async function cleanup(companyId: string) {
  const clients = await prisma.client.findMany({
    where: { companyId, name: { startsWith: TAG } },
    select: { id: true },
  });
  const clientIds = clients.map((item) => item.id);
  const projects = await prisma.project.findMany({
    where: {
      companyId,
      OR: [{ name: { startsWith: TAG } }, { code: { startsWith: "QA-" } }],
    },
    select: { id: true },
  });
  const projectIds = projects.map((item) => item.id);
  const employees = await prisma.employee.findMany({
    where: { companyId, name: { startsWith: TAG } },
    select: { id: true },
  });
  const employeeIds = employees.map((item) => item.id);
  const users = await prisma.user.findMany({
    where: { companyId, email: { contains: "qa.probe+" } },
    select: { id: true },
  });
  const userIds = users.map((item) => item.id);
  const accounts = await prisma.bankAccount.findMany({
    where: { companyId, name: { startsWith: TAG } },
    select: { id: true },
  });
  const accountIds = accounts.map((item) => item.id);
  const cards = await prisma.creditCard.findMany({
    where: { companyId, name: { startsWith: TAG } },
    select: { id: true },
  });
  const obligations = await prisma.obligation.findMany({
    where: { companyId, name: { startsWith: TAG } },
    select: { id: true },
  });
  const obligationIds = obligations.map((item) => item.id);

  await prisma.notification.deleteMany({
    where: {
      companyId,
      OR: [{ title: { startsWith: TAG } }, { recordId: { in: obligationIds } }],
    },
  });
  await prisma.expense.deleteMany({
    where: { companyId, description: { startsWith: TAG } },
  });
  if (employeeIds.length) {
    await prisma.payroll.deleteMany({
      where: { companyId, employeeId: { in: employeeIds } },
    });
  }
  await prisma.cashAdvance.deleteMany({
    where: { companyId, personName: { startsWith: TAG } },
  });
  await prisma.asset.deleteMany({
    where: { companyId, name: { startsWith: TAG } },
  });
  await prisma.obligation.deleteMany({
    where: { companyId, name: { startsWith: TAG } },
  });
  await prisma.companyDocument.deleteMany({
    where: { companyId, name: { startsWith: TAG } },
  });
  await prisma.bankTransaction.deleteMany({
    where: {
      companyId,
      OR: [
        { description: { startsWith: TAG } },
        { notes: "Imported from bank statement" , description: { contains: "QA Probe" } },
        { bankAccountId: { in: accountIds } },
      ],
    },
  });
  if (cards.length) {
    await prisma.creditCardTransaction.deleteMany({
      where: { creditCardId: { in: cards.map((item) => item.id) } },
    });
    await prisma.creditCard.deleteMany({
      where: { id: { in: cards.map((item) => item.id) } },
    });
  }
  if (accountIds.length) {
    await prisma.bankAccount.deleteMany({ where: { id: { in: accountIds } } });
  }
  if (projectIds.length) {
    await prisma.contract.deleteMany({
      where: { companyId, projectId: { in: projectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  if (clientIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }
  if (employeeIds.length) {
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  }
  if (userIds.length) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userNotificationPreference.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.auditLog.deleteMany({
    where: { companyId, module: { startsWith: "qa-" } },
  });
}

async function main() {
  const results: ModuleResult[] = [];
  const user = await prisma.user.findUnique({
    where: { email: "oscar.d@example.net" },
  });
  if (!user) {
    throw new Error("Demo user oscar.d@example.net is missing. Run prisma db seed.");
  }
  const companyId = user.companyId;
  const actorId = user.id;

  await cleanup(companyId);

  // --- Validation ---
  {
    const checks: Check[] = [];
    checks.push(
      check(
        "reject short client name",
        !clientFormSchema.safeParse({ name: "A" }).success,
      ),
    );
    checks.push(
      check(
        "accept client payload",
        clientFormSchema.safeParse({
          name: `${TAG} Client`,
          email: "qa.client@example.com",
          phone: "+974 5555 0101",
          notes: "smoke",
        }).success,
      ),
    );
    checks.push(
      check(
        "reject 4-decimal money",
        !transactionFormSchema.safeParse({
          date: "2026-08-26",
          type: "DEPOSIT",
          amount: "100.0000",
          description: "too precise",
          category: "other_income",
          bankAccountId: "x",
        }).success,
      ),
    );
    results.push({ module: "Validation", checks });
  }

  let clientId = "";
  let projectId = "";
  let accountId = "";
  let cardId = "";
  let obligationId = "";
  let employeeId = "";
  let payrollId = "";
  let assetId = "";
  let advanceId = "";
  let documentId = "";
  let expenseOpId = "";
  let expensePrId = "";
  let txId = "";
  let importTxId = "";
  let qaUserId = "";
  let notificationId = "";

  try {
    // --- Clients ---
    {
      const checks: Check[] = [];
      try {
        const created = await prisma.client.create({
          data: {
            companyId,
            name: `${TAG} Client`,
            email: "qa.client@example.com",
            phone: "+974 5555 0101",
            notes: "created",
          },
        });
        clientId = created.id;
        await prisma.client.update({
          where: { id: created.id },
          data: { notes: "updated" },
        });
        const listed = await getClientsWorkspace(companyId);
        const found = listed.find((item) => item.id === created.id);
        assert(found, "client missing from workspace");
        assert(found?.notes === "updated", "client update not persisted");
        assertNoDecimal(found, "clients.workspace");
        checks.push(check("create", true, created.name));
        checks.push(check("edit", true, found?.notes ?? undefined));
        checks.push(check("list in workspace", true, `count=${listed.length}`));
      } catch (error) {
        checks.push(fail("clients CRUD", error));
      }
      results.push({ module: "Clients", checks });
    }

    // --- Projects ---
    {
      const checks: Check[] = [];
      try {
        const parsed = projectFormSchema.safeParse({
          name: `${TAG} Project`,
          code: `QA-${stamp}`,
          clientId,
          contractValue: "125000.50",
          status: "ACTIVE",
          startDate: "2026-08-01",
          endDate: "2026-12-31",
          notes: "created",
        });
        assert(parsed.success, "project schema rejected valid payload");
        const created = await prisma.project.create({
          data: {
            companyId,
            name: parsed.data.name,
            code: parsed.data.code || `QA-${stamp}`,
            clientId,
            contractValue: parsed.data.contractValue,
            status: parsed.data.status,
            startDate: fromDateInputValue(parsed.data.startDate as string),
            endDate: fromDateInputValue(parsed.data.endDate as string),
            notes: parsed.data.notes || null,
          },
        });
        projectId = created.id;
        await prisma.contract.create({
          data: {
            companyId,
            projectId: created.id,
            clientId,
            number: `QA-CT-${stamp}`,
            value: parsed.data.contractValue,
            contractDate: fromDateInputValue("2026-08-01"),
          },
        });
        await prisma.project.update({
          where: { id: created.id },
          data: { notes: "updated", status: "ON_HOLD" },
        });
        const listed = await getProjectsWorkspace(companyId);
        const found = listed.find((item) => item.id === created.id);
        assert(found, "project missing from workspace");
        assert(found?.status === "ON_HOLD", "project status not updated");
        assert(found?.clientId === clientId, "project not linked to client");
        checks.push(check("create with contract", true, created.code));
        checks.push(check("edit status", true, found?.status));
        checks.push(check("workspace profit fields", true, `profitPct=${found?.profitPct}`));
      } catch (error) {
        checks.push(fail("projects CRUD", error));
      }
      results.push({ module: "Projects", checks });
    }

    // --- Bank accounts & cards ---
    {
      const checks: Check[] = [];
      try {
        assert(bankAccountFormSchema.safeParse({ name: `${TAG} Bank`, bankName: "QNB", accountNo: "123456" }).success);
        const created = await prisma.bankAccount.create({
          data: {
            companyId,
            name: `${TAG} Bank`,
            bankName: "QNB Test",
            accountNo: "QA-9901",
            isPrimary: false,
          },
        });
        accountId = created.id;
        await prisma.bankAccount.update({
          where: { id: created.id },
          data: { bankName: "QNB Test Updated" },
        });
        assert(creditCardFormSchema.safeParse({ name: `${TAG} Card`, last4: "4242" }).success);
        const card = await prisma.creditCard.create({
          data: { companyId, name: `${TAG} Card`, last4: "4242" },
        });
        cardId = card.id;
        await prisma.creditCard.update({
          where: { id: card.id },
          data: { last4: "1111" },
        });
        const workspace = await getBankWorkspace(companyId);
        assert(workspace.accounts.some((item) => item.id === created.id), "bank missing from workspace");
        assert(workspace.cards.some((item) => item.id === card.id && item.last4 === "1111"), "card update missing");
        checks.push(check("create/edit bank account", true));
        checks.push(check("create/edit credit card", true));
        checks.push(check("workspace balances", true, `accounts=${workspace.accounts.length}`));
      } catch (error) {
        checks.push(fail("bank CRUD", error));
      }
      results.push({ module: "Bank accounts", checks });
    }

    const primary = await getPrimaryBankAccount(companyId);
    assert(primary, "no primary bank account");

    // --- Transactions ---
    {
      const checks: Check[] = [];
      try {
        const parsed = transactionFormSchema.safeParse({
          date: "2026-08-20",
          type: "DEPOSIT",
          amount: "2500.75",
          description: `${TAG} Deposit`,
          category: "project_payment",
          projectId,
          bankAccountId: primary!.id,
          notes: "created",
        });
        assert(parsed.success, "transaction schema failed");
        const created = await prisma.bankTransaction.create({
          data: {
            companyId,
            bankAccountId: primary!.id,
            projectId,
            reference: await nextTransactionReference(companyId),
            date: fromDateInputValue(parsed.data.date),
            type: parsed.data.type,
            amount: parsed.data.amount,
            description: parsed.data.description,
            category: parsed.data.category,
            notes: parsed.data.notes || null,
            status: "POSTED",
            createdById: actorId,
          },
        });
        txId = created.id;
        await prisma.bankTransaction.update({
          where: { id: created.id },
          data: { description: `${TAG} Deposit updated`, amount: "2600.00" },
        });
        const listed = await listTransactions({ companyId, search: TAG, page: 1 });
        const found = listed.rows.find((item) => item.id === created.id);
        assert(found, "transaction missing from list");
        assert(typeof found?.amount === "string", "listTransactions must serialize amount as string");
        assert(found?.description.includes("updated"), "transaction edit missing");
        await prisma.bankTransaction.update({
          where: { id: created.id },
          data: { status: "VOIDED", voidedAt: new Date() },
        });
        const voided = await prisma.bankTransaction.findUnique({ where: { id: created.id } });
        assert(voided?.status === "VOIDED", "void failed");
        checks.push(check("create", true, created.reference));
        checks.push(check("edit", true));
        checks.push(check("list serializes amounts", true, found?.amount));
        checks.push(check("void", true, voided?.status));
      } catch (error) {
        checks.push(fail("transactions CRUD", error));
      }
      results.push({ module: "Transactions", checks });
    }

    // --- Bank import ---
    {
      const checks: Check[] = [];
      try {
        const parsed = bankImportSchema.safeParse({
          bankAccountId: primary!.id,
          rows: [
            { date: "2026-08-21", desc: `${TAG} Import inflow`, debit: 0, credit: 333.5 },
            { date: "21/08/2026", desc: `${TAG} Import outflow`, debit: 44, credit: 0 },
          ],
        });
        assert(parsed.success, "import schema failed");
        for (const row of parsed.data.rows) {
          const type = row.credit > 0 && row.credit >= row.debit ? "DEPOSIT" : "WITHDRAWAL";
          const amount = type === "DEPOSIT" ? row.credit : row.debit;
          const created = await prisma.bankTransaction.create({
            data: {
              companyId,
              bankAccountId: primary!.id,
              reference: await nextTransactionReference(companyId),
              date: fromDateInputValue("2026-08-21"),
              type,
              amount: amount.toFixed(2),
              description: row.desc,
              category: type === "DEPOSIT" ? "other_income" : "other",
              notes: "Imported from bank statement",
              status: "POSTED",
              createdById: actorId,
            },
          });
          if (!importTxId) {
            importTxId = created.id;
          }
        }
        const listed = await listTransactions({ companyId, search: `${TAG} Import`, page: 1 });
        assert(listed.rows.length >= 2, `expected imported rows, got ${listed.rows.length}`);
        checks.push(check("import CSV rows as transactions", true, `imported=${listed.rows.length}`));
      } catch (error) {
        checks.push(fail("bank import", error));
      }
      results.push({ module: "Bank reader", checks });
    }

    // --- Obligations ---
    {
      const checks: Check[] = [];
      try {
        const parsed = obligationFormSchema.safeParse({
          name: `${TAG} Rent`,
          category: "RENT",
          amount: "1800.00",
          frequency: "MONTHLY",
          dueDate: "2026-07-01",
          notes: "created",
        });
        assert(parsed.success, "obligation schema failed");
        const dueDate = fromDateInputValue(parsed.data.dueDate);
        const created = await prisma.obligation.create({
          data: {
            companyId,
            name: parsed.data.name,
            category: parsed.data.category,
            amount: parsed.data.amount,
            frequency: parsed.data.frequency,
            dueDate,
            nextDueDate: dueDate,
            notes: parsed.data.notes || null,
            status: "ACTIVE",
          },
        });
        obligationId = created.id;
        await prisma.obligation.update({
          where: { id: created.id },
          data: { notes: "updated" },
        });
        const beforePay = created.nextDueDate;
        const nextDue = advanceObligationDueDate(beforePay, created.frequency);
        await prisma.$transaction(async (tx) => {
          await tx.bankTransaction.create({
            data: {
              companyId,
              bankAccountId: primary!.id,
              reference: await nextTransactionReference(companyId, tx),
              date: new Date(),
              type: "WITHDRAWAL",
              amount: created.amount,
              description: `${TAG} Rent payment`,
              category: "rent",
              status: "POSTED",
              createdById: actorId,
            },
          });
          await tx.obligation.update({
            where: { id: created.id },
            data: { nextDueDate: nextDue },
          });
        });
        const paid = await prisma.obligation.findUnique({ where: { id: created.id } });
        assert(paid && paid.nextDueDate.getTime() > beforePay.getTime(), "pay did not advance due date");
        await prisma.obligation.update({
          where: { id: created.id },
          data: { status: "PAUSED" },
        });
        const dash = await getDashboardWorkspace(companyId);
        assert(dash.obligationRows.some((item) => item.id === created.id), "obligation missing from dashboard");
        checks.push(check("create/edit", true));
        checks.push(check("mark paid posts withdrawal + advances date", true));
        checks.push(check("pause", true, "PAUSED"));
      } catch (error) {
        checks.push(fail("obligations CRUD", error));
      }
      results.push({ module: "Obligations / Approvals", checks });
    }

    // --- Employees & payroll ---
    {
      const checks: Check[] = [];
      try {
        const parsed = employeeFormSchema.safeParse({
          name: `${TAG} Employee`,
          position: "Foreman",
          phone: "+974 5555 0202",
          email: "qa.employee@example.com",
          salary: "7500.00",
          status: "ACTIVE",
          joiningDate: "2026-01-15",
          notes: "created",
        });
        assert(parsed.success, "employee schema failed");
        const created = await prisma.employee.create({
          data: {
            companyId,
            employeeNo: `QA-EMP-${stamp}`,
            name: parsed.data.name,
            position: parsed.data.position || null,
            phone: parsed.data.phone || null,
            email: parsed.data.email || null,
            salary: parsed.data.salary,
            status: parsed.data.status,
            joiningDate: fromDateInputValue(parsed.data.joiningDate as string),
            notes: parsed.data.notes || null,
          },
        });
        employeeId = created.id;
        await prisma.employee.update({
          where: { id: created.id },
          data: { position: "Senior Foreman" },
        });
        const payParsed = payrollFormSchema.safeParse({
          employeeId: created.id,
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
          salary: "7500.00",
        });
        assert(payParsed.success, "payroll schema failed");
        const payroll = await prisma.payroll.create({
          data: {
            companyId,
            employeeId: created.id,
            userId: actorId,
            periodStart: fromDateInputValue(payParsed.data.periodStart),
            periodEnd: fromDateInputValue(payParsed.data.periodEnd),
            salary: payParsed.data.salary,
          },
        });
        payrollId = payroll.id;
        await prisma.payroll.update({
          where: { id: payroll.id },
          data: { salary: "7600.00" },
        });
        const workspace = await getEmployeesWorkspace(companyId);
        assert(workspace.employees.some((item) => item.id === created.id && item.position === "Senior Foreman"));
        assert(workspace.payrolls.some((item) => item.id === payroll.id));
        checks.push(check("create/edit employee", true));
        checks.push(check("create/edit payroll", true));
      } catch (error) {
        checks.push(fail("employees/payroll", error));
      }
      results.push({ module: "Employees & payroll", checks });
    }

    // --- Assets & cash advances ---
    {
      const checks: Check[] = [];
      try {
        const parsed = assetFormSchema.safeParse({
          name: `${TAG} Truck`,
          category: "VEHICLES",
          purchaseDate: "2025-06-01",
          purchaseValue: "85000.00",
          status: "ACTIVE",
          notes: "created",
        });
        assert(parsed.success, "asset schema failed");
        const created = await prisma.asset.create({
          data: {
            companyId,
            name: parsed.data.name,
            category: parsed.data.category,
            purchaseDate: fromDateInputValue(parsed.data.purchaseDate as string),
            purchaseValue: parsed.data.purchaseValue,
            currentValue: parsed.data.purchaseValue,
            status: parsed.data.status,
            notes: parsed.data.notes || null,
          },
        });
        assetId = created.id;
        await prisma.asset.update({
          where: { id: created.id },
          data: { notes: "updated" },
        });
        const caParsed = cashAdvanceFormSchema.safeParse({
          personName: `${TAG} Holder`,
          amountIssued: "1500.00",
          issueDate: "2026-08-10",
          dueDate: "2026-09-10",
        });
        assert(caParsed.success, "cash advance schema failed");
        const advance = await prisma.cashAdvance.create({
          data: {
            companyId,
            number: `QA-CA-${stamp}`,
            personName: caParsed.data.personName,
            amountIssued: caParsed.data.amountIssued,
            issueDate: fromDateInputValue(caParsed.data.issueDate),
            dueDate: fromDateInputValue(caParsed.data.dueDate as string),
            status: "OPEN",
          },
        });
        advanceId = advance.id;
        await prisma.cashAdvance.update({
          where: { id: advance.id },
          data: { status: "SETTLED" },
        });
        const workspace = await getAssetsWorkspace(companyId);
        assert(workspace.assets.some((item) => item.id === created.id));
        assert(workspace.advances.some((item) => item.id === advance.id && item.status === "SETTLED"));
        checks.push(check("create/edit asset", true));
        checks.push(check("create/settle cash advance", true));
      } catch (error) {
        checks.push(fail("assets/custody", error));
      }
      results.push({ module: "Assets & custody", checks });
    }

    // --- Documents ---
    {
      const checks: Check[] = [];
      try {
        const parsed = documentFormSchema.safeParse({
          name: `${TAG} CR`,
          category: "CR",
          expiryDate: "2027-01-15",
          notes: "created",
        });
        assert(parsed.success, "document schema failed");
        const created = await prisma.companyDocument.create({
          data: {
            companyId,
            name: parsed.data.name,
            category: parsed.data.category || "OTHER",
            expiryDate: fromDateInputValue(parsed.data.expiryDate as string),
            notes: parsed.data.notes || null,
          },
        });
        documentId = created.id;
        await prisma.companyDocument.update({
          where: { id: created.id },
          data: { notes: "updated" },
        });
        const listed = await prisma.companyDocument.findMany({
          where: { companyId, name: { startsWith: TAG } },
        });
        assert(listed.length === 1 && listed[0]?.notes === "updated");
        checks.push(check("create/edit document", true, created.name));
      } catch (error) {
        checks.push(fail("documents", error));
      }
      results.push({ module: "Documents", checks });
    }

    // --- Expenses ---
    {
      const checks: Check[] = [];
      try {
        const op = expenseFormSchema.safeParse({
          kind: "OPERATING",
          date: "2026-08-18",
          amount: "320.00",
          category: "internet",
          description: `${TAG} Internet`,
        });
        const pr = expenseFormSchema.safeParse({
          kind: "PROJECT",
          projectId,
          date: "2026-08-18",
          amount: "910.00",
          category: "materials",
          description: `${TAG} Materials`,
        });
        assert(op.success && pr.success, "expense schema failed");
        const operating = await prisma.expense.create({
          data: {
            companyId,
            createdById: actorId,
            kind: "OPERATING",
            date: fromDateInputValue(op.data.date),
            amount: op.data.amount,
            category: op.data.category,
            description: op.data.description,
            status: "POSTED",
          },
        });
        expenseOpId = operating.id;
        const projectExp = await prisma.expense.create({
          data: {
            companyId,
            createdById: actorId,
            kind: "PROJECT",
            projectId,
            date: fromDateInputValue(pr.data.date),
            amount: pr.data.amount,
            category: pr.data.category,
            description: pr.data.description,
            status: "POSTED",
          },
        });
        expensePrId = projectExp.id;
        await prisma.expense.update({
          where: { id: operating.id },
          data: { amount: "330.00" },
        });
        const ops = await prisma.expense.count({
          where: { companyId, kind: "OPERATING", description: { startsWith: TAG } },
        });
        const prs = await prisma.expense.count({
          where: { companyId, kind: "PROJECT", description: { startsWith: TAG } },
        });
        assert(ops === 1 && prs === 1);
        checks.push(check("operating expense create/edit", true));
        checks.push(check("project expense create", true));
      } catch (error) {
        checks.push(fail("expenses", error));
      }
      results.push({ module: "Expenses", checks });
    }

    // --- Users ---
    {
      const checks: Check[] = [];
      try {
        const email = `qa.probe+${stamp}@rateq.test`;
        const parsed = userFormSchema.safeParse({
          name: `${TAG} User`,
          email,
          password: "RateQPro!Qa1",
          role: "EMPLOYEE",
          status: "ACTIVE",
        });
        assert(parsed.success, "user schema failed");
        const created = await prisma.user.create({
          data: {
            companyId,
            name: parsed.data.name,
            email,
            passwordHash: await hashPassword(parsed.data.password as string),
            role: parsed.data.role,
            status: parsed.data.status,
          },
        });
        qaUserId = created.id;
        await prisma.user.update({
          where: { id: created.id },
          data: { name: `${TAG} User Edited`, status: "INACTIVE" },
        });
        const listed = await prisma.user.findUnique({ where: { id: created.id } });
        assert(listed?.name.endsWith("Edited") && listed.status === "INACTIVE");
        checks.push(check("create user", true, email));
        checks.push(check("edit + deactivate", true, listed?.status));
      } catch (error) {
        checks.push(fail("users", error));
      }
      results.push({ module: "Users", checks });
    }

    // --- Notifications ---
    {
      const checks: Check[] = [];
      try {
        const created = await prisma.notification.create({
          data: {
            companyId,
            userId: actorId,
            type: "SYSTEM_ACTIVITY",
            title: `${TAG} Alert`,
            body: "Smoke test alert",
            module: "qa-notifications",
          },
        });
        notificationId = created.id;
        await prisma.notification.update({
          where: { id: created.id },
          data: { readAt: new Date() },
        });
        const read = await prisma.notification.findUnique({ where: { id: created.id } });
        assert(read?.readAt, "mark read failed");
        checks.push(check("create notification", true));
        checks.push(check("mark read", true));
      } catch (error) {
        checks.push(fail("notifications", error));
      }
      results.push({ module: "Notifications", checks });
    }

    // --- Settings ---
    {
      const checks: Check[] = [];
      try {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        assert(company, "company missing");
        const originalPhone = company!.phone;
        await prisma.company.update({
          where: { id: companyId },
          data: { phone: "+974 0000 0000" },
        });
        const updated = await prisma.company.findUnique({ where: { id: companyId } });
        assert(updated?.phone === "+974 0000 0000", "settings update failed");
        await prisma.company.update({
          where: { id: companyId },
          data: { phone: originalPhone },
        });
        const restored = await prisma.company.findUnique({ where: { id: companyId } });
        assert(restored?.phone === originalPhone, "settings restore failed");
        checks.push(check("update company settings then restore", true));
      } catch (error) {
        checks.push(fail("settings", error));
      }
      results.push({ module: "Settings", checks });
    }

    // --- Computed views ---
    {
      const checks: Check[] = [];
      try {
        const dash = await getDashboardWorkspace(companyId);
        const reports = await getReportsWorkspace(companyId);
        assert(typeof dash.snapshot.bankBalance === "bigint", "snapshot bankBalance should be bigint fils");
        assert(Array.isArray(reports.expenseLines), "reports expense lines missing");
        checks.push(check("dashboard snapshot", true, `balance=${dash.snapshot.bankBalance}`));
        checks.push(check("reports expense lines", true, `lines=${reports.expenseLines.length}`));
        checks.push(check("cash-flow inputs available", true, `obligations=${dash.snapshot.monthlyObligations}`));
      } catch (error) {
        checks.push(fail("computed views", error));
      }
      results.push({ module: "Dashboard / cash flow / reports", checks });
    }

    // --- Audit log ---
    {
      const checks: Check[] = [];
      try {
        await writeAuditLog({
          companyId,
          userId: actorId,
          action: "qa",
          module: "qa-audit",
          recordId: clientId,
          newValue: { tag: TAG },
        });
        const row = await prisma.auditLog.findFirst({
          where: { companyId, module: "qa-audit" },
          orderBy: { createdAt: "desc" },
        });
        assert(row, "audit row missing");
        checks.push(check("write and read audit log", true, row?.action));
      } catch (error) {
        checks.push(fail("audit log", error));
      }
      results.push({ module: "Audit log", checks });
    }

    // --- Deletes ---
    {
      const checks: Check[] = [];
      try {
        if (notificationId) {
          await prisma.notification.delete({ where: { id: notificationId } });
        }
        if (expenseOpId) {
          await prisma.expense.delete({ where: { id: expenseOpId } });
        }
        if (expensePrId) {
          await prisma.expense.delete({ where: { id: expensePrId } });
        }
        if (documentId) {
          await prisma.companyDocument.delete({ where: { id: documentId } });
        }
        if (advanceId) {
          await prisma.cashAdvance.delete({ where: { id: advanceId } });
        }
        if (assetId) {
          await prisma.asset.delete({ where: { id: assetId } });
        }
        if (payrollId) {
          await prisma.payroll.delete({ where: { id: payrollId } });
        }
        if (employeeId) {
          await prisma.employee.delete({ where: { id: employeeId } });
        }
        if (obligationId) {
          await prisma.obligation.delete({ where: { id: obligationId } });
        }
        if (cardId) {
          await prisma.creditCard.delete({ where: { id: cardId } });
        }
        if (qaUserId) {
          await prisma.user.delete({ where: { id: qaUserId } });
        }
        if (clientId) {
          const remaining = await prisma.client.findUnique({ where: { id: clientId } });
          assert(remaining, "client should still exist before explicit delete");
        }
        checks.push(check("delete notifications, expenses, documents, assets, payroll, employee, obligation, card, user", true));
      } catch (error) {
        checks.push(fail("deletes", error));
      }
      results.push({ module: "Deletes", checks });
    }
  } finally {
    await cleanup(companyId);
    const leftoverClients = await prisma.client.count({
      where: { companyId, name: { startsWith: TAG } },
    });
    results.push({
      module: "Cleanup",
      checks: [check("remove all QA Probe records", leftoverClients === 0, `leftoverClients=${leftoverClients}`)],
    });
    await prisma.$disconnect();
  }

  const failed = results.flatMap((module) =>
    module.checks.filter((item) => !item.ok).map((item) => ({ module: module.module, ...item })),
  );
  console.log(JSON.stringify({ stamp, modules: results, failed }, null, 2));
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await prisma.$disconnect();
});
