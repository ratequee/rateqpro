"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RecordFormDialog } from "@/features/records/form-dialog";
import { saveUserAction } from "./actions";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export function UserFormDialog({
  user,
}: {
  user?: {
    id: string;
    name: string;
    email: string;
    role: (typeof ROLES)[number];
    status: (typeof STATUSES)[number];
  };
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  return (
    <RecordFormDialog
      title={user ? tCommon("edit") : t("add")}
      trigger={
        <Button size={user ? "sm" : "default"} variant={user ? "outline" : "default"}>
          {user ? tCommon("edit") : t("add")}
        </Button>
      }
      action={saveUserAction}
    >
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="user-name">{t("name")}</Label>
        <Input id="user-name" name="name" required defaultValue={user?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="user-email">{t("email")}</Label>
        <Input id="user-email" name="email" type="email" required defaultValue={user?.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="user-password">{t("password")}</Label>
        <Input
          id="user-password"
          name="password"
          type="password"
          minLength={user ? undefined : 8}
          required={!user}
        />
        <p className="text-[11px] text-muted-foreground">{user ? t("passwordHint") : t("passwordRequired")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="user-role">{t("role")}</Label>
        <NativeSelect id="user-role" name="role" defaultValue={user?.role ?? "EMPLOYEE"}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="user-status">{t("status")}</Label>
        <NativeSelect id="user-status" name="status" defaultValue={user?.status ?? "ACTIVE"}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </RecordFormDialog>
  );
}
