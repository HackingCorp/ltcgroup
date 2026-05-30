import { cn } from "@/lib/utils";
import { Icon } from "./icon";

interface KpiCardProps {
  label: React.ReactNode;
  value?: string | number;
  unit?: string;
  delta?: string;
  deltaDir?: "up" | "down";
  hero?: boolean;
  accent?: boolean;
  after?: React.ReactNode;
  children?: React.ReactNode;
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaDir = "up",
  hero = false,
  accent = false,
  after,
  children,
}: KpiCardProps) {
  return (
    <div className={cn("kpi-card", hero && "hero", accent && "accent")}>
      <div className="lbl">
        <span>{label}</span>
        {after}
      </div>
      {value !== undefined && (
        <div className="val">
          {value}
          {unit && <small>{unit}</small>}
        </div>
      )}
      {delta && (
        <div className={cn("delta", deltaDir === "down" && "down")}>
          <Icon name={deltaDir === "down" ? "arrowDown" : "arrowUp"} size={11} />
          {delta}
        </div>
      )}
      {children}
    </div>
  );
}
