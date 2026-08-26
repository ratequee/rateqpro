import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CashAdvancesRedirect() {
  const locale = await getLocale();
  redirect({ href: "/assets", locale });
}
