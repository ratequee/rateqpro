import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3001";
const EMAIL = "oscar.d@example.net";
const PASSWORD = "RateQPro!Demo";
const TAG = `QA UI ${Date.now().toString().slice(-5)}`;

const ROUTES = [
  "/en/dashboard",
  "/en/approvals",
  "/en/bank-accounts",
  "/en/bank-reader",
  "/en/transactions",
  "/en/obligations",
  "/en/cash-flow",
  "/en/tax",
  "/en/clients",
  "/en/projects",
  "/en/employees",
  "/en/documents",
  "/en/assets",
  "/en/operating-expenses",
  "/en/project-expenses",
  "/en/reports",
  "/en/settings",
  "/en/users",
  "/en/roles",
  "/en/notifications",
  "/en/audit-log",
];

function pageErrors(text) {
  const needles = [
    "Decimal objects are not supported",
    "Application error",
    "Unhandled Runtime Error",
    "This module is connected to the application shell",
    "digest",
  ];
  return needles.filter((item) => text.includes(item));
}

async function visit(page, path) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(400);
  const body = (await page.locator("body").innerText().catch(() => "")) ?? "";
  const errors = pageErrors(body);
  return {
    path,
    status: response?.status() ?? 0,
    title: (await page.locator("h1").first().innerText().catch(() => "")).trim(),
    errors,
    ok: (response?.status() ?? 0) < 400 && errors.length === 0 && !body.includes("Something went wrong"),
    snippet: body.slice(0, 80).replace(/\s+/g, " "),
  };
}

async function fillByLabel(page, label, value) {
  const field = page.getByLabel(label, { exact: false }).first();
  await field.fill(value);
}

async function submitDialog(page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 20000 });
}

async function confirmDelete(page) {
  await page.getByRole("button", { name: "Delete" }).last().click();
  const alert = page.getByRole("alertdialog");
  await alert.getByRole("button", { name: "Confirm" }).click();
  await alert.waitFor({ state: "hidden", timeout: 20000 });
}

async function crudOnList(page, options) {
  const result = { module: options.module, checks: [] };
  try {
    await page.goto(`${BASE}${options.path}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.getByRole("button", { name: options.addName }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    for (const field of options.fields) {
      if (field.type === "select") {
        await dialog.locator(`select[name="${field.name}"]`).selectOption(field.value);
      } else {
        await dialog.locator(`[name="${field.name}"]`).first().fill(field.value);
      }
    }
    await submitDialog(page);
    await page.waitForTimeout(800);
    const createdVisible = await page.getByText(options.visibleText, { exact: false }).first().isVisible();
    result.checks.push({ name: "add", ok: createdVisible, detail: options.visibleText });

    if (createdVisible && options.edit) {
      const row = page
        .locator("div")
        .filter({ hasText: options.visibleText })
        .filter({ has: page.getByRole("button", { name: "Edit" }) })
        .last();
      await row.getByRole("button", { name: "Edit" }).first().click();
      const editDialog = page.getByRole("dialog");
      await editDialog.waitFor({ state: "visible" });
      await editDialog.locator(`[name="${options.edit.name}"]`).first().fill(options.edit.value);
      await submitDialog(page);
      await page.waitForTimeout(800);
      const editedVisible = await page.getByText(options.edit.expect, { exact: false }).first().isVisible().catch(() => true);
      result.checks.push({ name: "edit", ok: Boolean(editedVisible), detail: options.edit.expect });
    }

    const search = options.edit?.expect ?? options.visibleText;
    const row = page
      .locator("div")
      .filter({ hasText: search })
      .filter({ has: page.getByRole("button", { name: "Delete" }) })
      .last();
    await row.getByRole("button", { name: "Delete" }).first().click();
    const alert = page.getByRole("alertdialog");
    await alert.getByRole("button", { name: "Confirm" }).click();
    await page.waitForTimeout(3000);
    await page.reload({ waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText();
    result.checks.push({ name: "delete", ok: !bodyText.includes(search), detail: search });
  } catch (error) {
    result.checks.push({
      name: "ui-crud",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return result;
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const report = { login: null, routes: [], crud: [], consoleErrors: [] };

  try {
    await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|دخول/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    report.login = { ok: page.url().includes("/dashboard"), url: page.url() };

    if (!process.env.QA_SKIP_ROUTES) {
      for (const path of ROUTES) {
        report.routes.push(await visit(page, path));
      }
    }

    report.crud.push(
      await crudOnList(page, {
        module: "Clients UI",
        path: "/en/clients",
        addName: "Add client",
        visibleText: TAG,
        fields: [
          { name: "name", value: TAG },
          { name: "phone", value: "+974 1111 2222" },
        ],
        edit: { name: "notes", value: "ui-edited", expect: TAG },
      }),
    );
    report.crud.push(
      await crudOnList(page, {
        module: "Documents UI",
        path: "/en/documents",
        addName: "Add document",
        visibleText: `${TAG} License`,
        fields: [
          { name: "name", value: `${TAG} License` },
          { name: "category", type: "select", value: "LICENSE" },
        ],
        edit: { name: "notes", value: "ui-edited", expect: `${TAG} License` },
      }),
    );
  } finally {
    report.consoleErrors = [...new Set(consoleErrors)].slice(0, 20);
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  const routeFails = report.routes.filter((item) => !item.ok);
  const crudFails = report.crud.flatMap((item) => item.checks.filter((check) => !check.ok));
  if (!report.login?.ok || routeFails.length || crudFails.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
