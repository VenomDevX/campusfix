"use client";

import ApiError from "@/components/ApiError";
import { BarList, DepartmentBars, TrendLines } from "@/components/Charts";
import HotspotMap from "@/components/HotspotMap";
import { api, recommendation } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

const loadAll = () => Promise.all([api.overview(), api.categories(), api.hotspots(), api.departments()]);

export default function Analytics() {
  const { data, error } = usePoll(loadAll);
  if (error) return <ApiError message={error} />;
  if (!data) return <p className="text-mute">Loading analytics…</p>;
  const [ov, cats, hotspots, depts] = data;
  const resolvedPct = ov.total_issues ? Math.round((ov.resolved_issues / ov.total_issues) * 100) : 0;

  return (
    <div className="space-y-14">
      <div>
        <h1 className="t-section">Analytics</h1>
        <p className="mt-1 text-[14px] text-body">Where faults cluster, what keeps breaking, and how fast teams respond.</p>
      </div>

      <section aria-labelledby="map">
        <h2 id="map" className="mb-4 text-[15px] font-semibold">Campus hotspots</h2>
        <HotspotMap data={hotspots} />
      </section>

      <section aria-labelledby="recurring">
        <h2 id="recurring" className="border-b border-ink pb-3 text-[15px] font-semibold">Recurring faults</h2>
        {ov.insights.length ? (
          <ul className="divide-y divide-hairline">
            {ov.insights.map((i) => (
              <li key={i.message} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
                <p className="font-medium">{i.category} in {i.building}<span className="num block font-mono text-[12px] font-normal text-mute">{i.count} reports in 30 days</span></p>
                <p className="text-[14px] text-body">{recommendation(i.message)}</p>
              </li>
            ))}
          </ul>
        ) : <p className="py-4 text-[14px] text-mute">No repeating faults in the last 30 days.</p>}
      </section>

      <div className="grid grid-cols-1 gap-x-14 gap-y-14 lg:grid-cols-2">
        <Panel title="By category"><BarList data={cats.by_category} /></Panel>
        <Panel title="By building"><BarList data={cats.by_building} /></Panel>
        <Panel title="By priority"><BarList data={cats.by_priority} priority /></Panel>
        <Panel title="Last 7 days" meta={`${resolvedPct}% resolved, avg ${ov.avg_resolution_hours}h`}><TrendLines data={ov.trend} /></Panel>
      </div>

      <Panel title="Team workload"><DepartmentBars data={depts} /></Panel>
    </div>
  );
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between border-b border-ink pb-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {meta && <span className="t-caption num">{meta}</span>}
      </div>
      {children}
    </section>
  );
}
