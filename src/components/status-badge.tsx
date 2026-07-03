import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/types";

const styles: Record<DisplayStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "border-neon-green/50 bg-neon-green/10 text-neon-green glow-green animate-pulse-glow",
  },
  suspended: {
    label: "Suspended",
    className: "border-destructive/50 bg-destructive/10 text-destructive glow-red",
  },
  overdue: {
    label: "Overdue",
    className: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: DisplayStatus;
  className?: string;
}) {
  const s = styles[status];
  return (
    <Badge variant="outline" className={cn("font-semibold uppercase tracking-wider", s.className, className)}>
      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}
