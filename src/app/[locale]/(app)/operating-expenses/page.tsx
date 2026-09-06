import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function OperatingExpensesPage() {
  const locale = await getLocale();
  redirect({ href: "/expenses?kind=operating", locale });
}
