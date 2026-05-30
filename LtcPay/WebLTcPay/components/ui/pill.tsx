import { cn } from "@/lib/utils";

type PillTone = "success" | "warn" | "fail" | "info" | "neutral" | "live" | "test";

interface PillProps {
  tone?: PillTone;
  plain?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Pill({ tone = "neutral", plain = false, children, className }: PillProps) {
  return (
    <span className={cn("pill", tone, plain && "pill-plain", className)}>
      {children}
    </span>
  );
}
