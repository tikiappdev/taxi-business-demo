import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-ink">{value}</p>
        </div>
        {icon ? <div className="rounded-md bg-slate-100 p-2 text-slate-700">{icon}</div> : null}
      </div>
      {sub ? <p className="mt-3 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
