"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ApiError from "@/components/ApiError";
import IssueTable from "@/components/IssueTable";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

const STATUSES = ["AI Verified", "Assigned", "In Progress", "Resolved", "Reopened"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function AllTicketsPage() {
  return <Suspense fallback={<p className="text-mute">Loading tickets…</p>}><AllTickets /></Suspense>;
}

function AllTickets() {
  const { data, error } = usePoll(() => api.issues("?sort=recent"));
  // Filters live in the URL so the view can be shared and survives reloads.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const q = params.get("q") ?? "";

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  if (error) return <ApiError message={error} />;
  const rows = (data ?? []).filter((i) =>
    (!status || i.status === status) && (!priority || i.priority === priority) &&
    (!q || `${i.id} ${i.title} ${i.building} ${i.department}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-section">Tickets</h1>
        <p className="mt-1 text-[14px] text-body">Every report, newest first.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" type="search" className="field" placeholder="ID, title, location…" autoComplete="off"
            spellCheck={false} defaultValue={q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <div className="w-40">
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" className="field" value={status} onChange={(e) => set("status", e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="priority" className="label">Priority</label>
          <select id="priority" name="priority" className="field" value={priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="">All</option>
            {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {data && <span className="t-caption num pb-3">{rows.length} of {data.length}</span>}
      </div>
      <section className="border-t border-ink">
        {data ? <IssueTable issues={rows} caption="All tickets" /> : <p className="py-8 text-mute">Loading tickets…</p>}
      </section>
    </div>
  );
}
