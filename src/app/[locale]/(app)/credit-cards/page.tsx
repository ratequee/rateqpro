import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CreditCardsRedirect() {
  const locale = await getLocale();
  redirect({ href: "/bank-accounts", locale });
}
