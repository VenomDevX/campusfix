import type { Analysis } from "@/types";
import { PriorityBadge } from "./Badges";

const BAR: Record<string, string> = {
  Critical: "bg-[var(--crit-fg)]", High: "bg-[var(--high-fg)]", Medium: "bg-ink", Low: "bg-mute",
};

/** AI result: no container, hairlines only. */
export default function AnalysisCard({ a }: { a: Analysis }) {
  return (
    <section aria-label="AI analysis" className="@container border-t border-ink">
      <div className="flex items-baseline justify-between gap-4 py-3">
        <h2 className="text-[14px] font-medium">Analysis</h2>
        <span className="t-caption num min-w-0 text-right">{a.model ? `${a.model}, ` : ""}{a.pipeline_ms} ms</span>
      </div>

      <dl className="grid grid-cols-1 border-y border-hairline @lg:grid-cols-3 @lg:divide-x @lg:divide-hairline">
        <div className="py-4 @lg:pr-5">
          <dt className="text-[13px] text-body">Issue</dt>
          <dd className="t-title mt-1">{a.category}</dd>
          <dd className="mt-2 flex items-center gap-2">
            <span className="h-0.5 bg-ink" style={{ width: `${a.confidence * 64}px` }} />
            <span className="t-caption num">{Math.round(a.confidence * 100)}% confidence</span>
          </dd>
        </div>
        <div className="border-t border-hairline py-4 @lg:border-t-0 @lg:px-5">
          <dt className="text-[13px] text-body">Priority</dt>
          <dd className="t-title num mt-1">{a.priority_score}<span className="text-[15px] font-normal text-mute">/100</span></dd>
          <dd className="mt-2 flex items-center gap-2">
            <span className={`h-0.5 ${BAR[a.priority]}`} style={{ width: `${a.priority_score * 0.48}px` }} />
            <PriorityBadge priority={a.priority} />
          </dd>
        </div>
        <div className="border-t border-hairline py-4 @lg:border-t-0 @lg:pl-5">
          <dt className="text-[13px] text-body">Routed to</dt>
          <dd className="mt-1 text-[17px] font-semibold leading-6 tracking-[-0.02em]">{a.department}</dd>
        </div>
      </dl>

      <div className="pt-4">
        <h3 className="text-[13px] text-body">Why this priority</h3>
        <ul className="mt-2 divide-y divide-hairline">
          {a.reasoning.map((r) => (
            <li key={r} className="py-2 text-[14px] text-ink">{r}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
