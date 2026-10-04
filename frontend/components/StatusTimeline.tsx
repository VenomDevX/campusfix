import { formatDate } from "@/lib/api";
import type { IssueDetail } from "@/types";
import { StatusBadge } from "./Badges";

const LIFECYCLE = ["Reported", "AI Verified", "Assigned", "In Progress", "Resolved"] as const;

/** Single-line lifecycle: ink up to the current step, hairline after. */
export function LifecycleBar({ status }: { status: string }) {
  const idx = status === "Reopened" ? 1 : LIFECYCLE.indexOf(status as (typeof LIFECYCLE)[number]);
  return (
    <ol className="grid grid-cols-5" aria-label={`Status: ${status}`}>
      {LIFECYCLE.map((s, i) => (
        <li key={s} aria-current={i === idx ? "step" : undefined}>
          <div className={`h-px ${i <= idx ? "bg-ink" : "bg-hairline-strong"}`} />
          <p className={`mt-2 pr-2 text-[12px] leading-4 ${i <= idx ? "text-ink" : "text-mute"} ${i === idx ? "font-medium" : ""}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

/** Event log, newest first. */
export default function StatusTimeline({ history }: { history: IssueDetail["history"] }) {
  return (
    <ol className="divide-y divide-hairline">
      {[...history].reverse().map((h, i) => (
        <li key={i} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
            <StatusBadge status={h.status} />
            <time className="t-caption num" dateTime={h.created_at}>{formatDate(h.created_at)}</time>
          </div>
          {h.note && <p className="text-[14px] text-ink">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
