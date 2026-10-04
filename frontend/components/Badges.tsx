import type { Priority, Status } from "@/types";

const PRIORITY: Record<Priority, string> = {
  Critical: "bg-[var(--crit-bg)] text-[var(--crit-fg)]",
  High: "bg-[var(--high-bg)] text-[var(--high-fg)]",
  Medium: "bg-[var(--med-bg)] text-[var(--med-fg)]",
  Low: "bg-[var(--low-bg)] text-[var(--low-fg)] ring-1 ring-inset ring-hairline-strong",
};

/** Square semantic tag (Vercel soft/deep pairs). */
export function PriorityBadge({ priority, score }: { priority: Priority; score?: number }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium ${PRIORITY[priority]}`}>
      {priority}
      {score !== undefined && <span className="num font-mono opacity-70">{score}</span>}
    </span>
  );
}

const STATUS_MARK: Record<Status, string> = {
  Reported: "border border-mute",
  "AI Verified": "border border-ink",
  Assigned: "bg-mute",
  "In Progress": "bg-[var(--high-fg)]",
  Resolved: "bg-accent",
  Reopened: "bg-[var(--crit-fg)]",
};

/** Plain text with a small square state marker. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] ${status === "Resolved" ? "text-accent" : "text-body"}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 ${STATUS_MARK[status]}`} />
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className="text-[13px] text-mute">{category}</span>;
}
