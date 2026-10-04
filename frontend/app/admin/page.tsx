"use client";

import Link from "next/link";
import ApiError from "@/components/ApiError";
import { StatusBadge } from "@/components/Badges";
import { DepartmentBars } from "@/components/Charts";
import { HotspotList } from "@/components/HotspotMap";
import IssueTable from "@/components/IssueTable";
import Metric from "@/components/Metric";
import { api, recommendation } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import type { Status } from "@/types";

const loadAll = async () => {
  const data = await Promise.all([
    api.overview(), api.issues("?open_only=true"), api.issues("?sort=recent"), api.hotspots(), api.departments(), api.categories(),
  ]);
  // Highlight a ticket created in the last 15 minutes (the one just reported in the demo).
  const newest = data[2][0];
  const fresh = newest && Date.now() - new Date(newest.created_at + "Z").getTime() < 15 * 60 * 1000 ? newest.id : null;
  return [...data, fresh] as const;
};

export default function Dashboard() {
  const { data, error } = usePoll(loadAll);
  if (error) return <ApiError message={error} />;
  if (!data) return <DashboardSkeleton />;
  const [ov, queue, recent, hotspots, depts, cats, fresh] = data;

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-section">Dashboard</h1>
          <p className="mt-1 text-[14px] text-body">Open issues across campus, ordered by risk. Refreshes every 10 seconds.</p>
        </div>
        <Link href="/admin/analytics" className="btn btn-secondary">View analytics</Link>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 border-y border-hairline md:grid-cols-3 xl:grid-cols-6 xl:divide-x xl:divide-hairline">
        <Metric label="Reports" value={ov.total_reports} hint={`${ov.total_issues} unique issues`} />
        <Metric label="Open" value={ov.active_issues} />
        <Metric label="Critical" value={ov.critical_issues} tone={ov.critical_issues ? "critical" : undefined} />
        <Metric label="Resolved" value={ov.resolved_issues} />
        <Metric label="Avg. resolution" value={`${ov.avg_resolution_hours}h`} />
        <Metric label="Duplicates merged" value={ov.duplicates_merged} />
      </section>

      {ov.insights.map((i) => (
        <p key={i.message} className="border-l-2 border-[var(--high-fg)] pl-4 text-[15px]">
          <span className="font-medium">{i.category} has failed {i.count} times in {i.building} this month.</span>{" "}
          <span className="text-body">{recommendation(i.message)}</span>
        </p>
      ))}

      <section aria-labelledby="queue">
        <div className="flex items-baseline justify-between border-b border-ink pb-3">
          <h2 id="queue" className="text-[15px] font-semibold">Priority queue</h2>
          <span className="t-caption num">{queue.length} open</span>
        </div>
        <IssueTable issues={queue} highlight={fresh} caption="Open issues sorted by priority" />
      </section>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="recent">
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <h2 id="recent" className="text-[15px] font-semibold">Recent reports</h2>
            <Link href="/admin/issues" className="link text-[13px]">All tickets</Link>
          </div>
          <IssueTable issues={recent.slice(0, 6)} highlight={fresh} compact caption="Most recent reports" />
        </section>
        <div className="space-y-12">
          <section aria-labelledby="hot">
            <h2 id="hot" className="mb-3 text-[15px] font-semibold">Hotspots</h2>
            <HotspotList data={hotspots} />
          </section>
          <section aria-labelledby="status">
            <h2 id="status" className="mb-3 text-[15px] font-semibold">By status</h2>
            <ul className="grid grid-cols-2 gap-x-6 border-t border-hairline">
              {cats.by_status.map((s) => (
                <li key={s.name} className="flex items-center justify-between border-b border-hairline py-2.5">
                  <StatusBadge status={s.name as Status} />
                  <span className="num font-mono text-[13px]">{s.value}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="teams">
            <h2 id="teams" className="mb-1 text-[15px] font-semibold">Team workload</h2>
            <DepartmentBars data={depts} />
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard…" className="space-y-14">
      <div className="h-10 w-48 rounded-[4px] bg-inset" />
      <div className="grid grid-cols-2 gap-6 border-y border-hairline py-5 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-14 rounded-[4px] bg-inset" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 rounded-[4px] bg-inset" />)}
      </div>
    </div>
  );
}
