"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "start",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "start" | "end";
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-[min(20rem,85vw)] flex-col bg-sidebar text-sidebar-foreground shadow-hero",
          side === "start" ? "start-0 border-e" : "end-0 border-s",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute end-4 top-4 rounded-sm text-white/70 hover:text-white">
          <X className="size-4" />
          <span className="sr-only">×</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
