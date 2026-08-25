"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

export function FileUploader({
  id,
  name,
  label,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="file"
        required={required}
        accept={ACCEPT}
        aria-label={label || t("add")}
      />
    </div>
  );
}
