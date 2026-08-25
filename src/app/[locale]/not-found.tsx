import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{t("noResults")}</p>
    </div>
  );
}
