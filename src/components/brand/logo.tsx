import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex h-8 items-center", className)}>
      <Image
        src="/brand/logo.svg"
        alt="RateQ"
        width={128}
        height={32}
        className="h-8 w-auto dark:hidden"
        priority={priority}
      />
      <Image
        src="/brand/white_logo.svg"
        alt="RateQ"
        width={128}
        height={32}
        className="hidden h-8 w-auto dark:block"
        priority={priority}
      />
    </span>
  );
}
