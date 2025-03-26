import { cn } from "@/lib/utils";

type MetricStatus = "normal" | "warning" | "critical";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const statusColors: Record<MetricStatus, string> = {
  normal: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

export function MetricCard({
  label,
  value,
  unit,
  status = "normal",
  trend,
  className,
}: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums",
            statusColors[status]
          )}
        >
          {typeof value === "number"
            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "ml-2 text-xs font-medium",
              trend === "up" ? "text-success" : "text-destructive"
            )}
          >
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
    </div>
  );
}
