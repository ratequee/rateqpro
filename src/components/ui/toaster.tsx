"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-card text-foreground",
        },
      }}
    />
  );
}
