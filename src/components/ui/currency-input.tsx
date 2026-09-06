"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CurrencyInput({
  id,
  name,
  label,
  currencyCode,
  defaultValue,
  value,
  onChange,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  currencyCode: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-xs font-semibold text-muted-foreground">
          {currencyCode}
        </span>
        <Input
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required={required}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className="ps-14"
        />
      </div>
    </div>
  );
}
