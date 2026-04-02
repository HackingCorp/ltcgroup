import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        getStatusColor(status),
        className
      )}
    >
      {status}
    </span>
  );
}
