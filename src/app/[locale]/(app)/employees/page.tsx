import { getLocale, getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getEmployeesWorkspace } from "@/lib/finance/workspace";
import { formatAmount } from "@/lib/formatting/currency";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/ui/status-pill";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";

export default async function EmployeesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("employeesPage");
  const { employees, payrolls, totalPayroll } = await getEmployeesWorkspace(user.companyId);
  const active = employees.filter((item) => item.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader title={t("title")} icon={Users} />
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard accent="brand" label={t("total")} value={String(employees.length)} />
        <KpiCard accent="success" label={t("active")} value={String(active)} valueClassName="text-success" />
        <KpiCard
          accent="warning"
          label={t("inactive")}
          value={String(employees.length - active)}
          valueClassName="text-warning"
        />
        <KpiCard
          accent="brand"
          label={t("payroll")}
          value={formatAmount(totalPayroll, locale)}
          hint={user.currencyCode}
        />
      </section>
      {employees.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-3">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded-[13px] border border-border bg-card p-3.5">
              <div className="mb-2.5 flex items-center gap-2.5">
                <InitialsAvatar name={employee.name} tone="info" size="lg" />
                <div>
                  <div className="text-[13px] font-bold">{employee.name}</div>
                  <div className="text-[11px] text-muted-foreground">{employee.position ?? "—"}</div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[7px] bg-muted px-2.5 py-1.5">
                <span className="text-[10px] text-muted-foreground">{t("salary")}</span>
                <span className="text-sm font-bold text-primary">
                  {formatAmount(employee.salary.toString(), locale)} {user.currencyCode}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <SectionCard title={t("title")}>
        {payrolls.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("payrollEmpty")}</p>
        ) : (
          payrolls.map((row) => (
            <div key={row.id} className="flex items-center justify-between border-b border-muted py-2 text-[12.5px] last:border-0">
              <span className="font-semibold">{row.employee.name}</span>
              <span className="font-bold text-primary">
                {formatAmount(row.salary.toString(), locale)} {user.currencyCode}
              </span>
              <StatusPill variant="pending">—</StatusPill>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
