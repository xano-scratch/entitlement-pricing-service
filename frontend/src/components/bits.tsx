import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

// A client's active/suspended status.
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "suspended"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-muted text-muted-foreground";
  return <Badge className={cn("border-transparent", tone)}>{titleCase(status)}</Badge>;
}

// A fee schedule's lifecycle state.
export function ScheduleStatusBadge({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "draft"
        ? "bg-sky-500/15 text-sky-400"
        : "bg-muted text-muted-foreground";
  return <Badge className={cn("border-transparent", tone)}>{titleCase(status)}</Badge>;
}

// An allowed / denied grant, with an optional metered limit.
export function GrantBadge({ allowed, limit }: { allowed: boolean; limit?: number | null }) {
  if (!allowed) {
    return (
      <Badge className="gap-1 border-transparent bg-muted text-muted-foreground">
        <Minus className="size-3" /> Denied
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-400">
      <Check className="size-3" />
      {limit == null ? "Allowed" : `Up to ${limit}`}
    </Badge>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {children}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
      {children}
    </div>
  );
}
