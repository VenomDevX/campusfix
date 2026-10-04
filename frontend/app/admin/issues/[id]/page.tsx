"use client";

import { ArrowLeft, Camera, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ApiError from "@/components/ApiError";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import StatusTimeline, { LifecycleBar } from "@/components/StatusTimeline";
import { api, formatDate, img } from "@/lib/api";
import type { IssueDetail, Status } from "@/types";

// Mirrors backend TRANSITIONS (services/tickets.py)
const ACTIONS: Record<Status, Status[]> = {
  Reported: ["Assigned"],
  "AI Verified": ["Assigned", "In Progress", "Resolved"],
  Assigned: ["In Progress", "Resolved"],
  "In Progress": ["Resolved"],
  Resolved: ["Reopened"],
  Reopened: ["Assigned", "In Progress", "Resolved"],
};
const LABEL: Partial<Record<Status, string>> = {
  Assigned: "Assign", "In Progress": "Start work", Resolved: "Mark resolved", Reopened: "Reopen",
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [after, setAfter] = useState<File | null>(null);

  useEffect(() => { api.issue(id).then(setIssue).catch((e) => setError(e.message)); }, [id]);

  async function move(status: Status) {
    if (status === "Resolved" && !resolving) { setResolving(true); return; }
    setBusy(status); setActionError("");
    const form = new FormData();
    form.append("status", status);
    if (status === "Resolved") {
      form.append("remarks", remarks);
      if (after) form.append("after_image", after);
    }
    try {
      setIssue(await api.updateStatus(id, form));
      setResolving(false); setRemarks(""); setAfter(null);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ApiError message={error} />;
  if (!issue) return <p className="text-mute">Loading ticket…</p>;
  const supports = issue.reports.filter((r) => r.kind === "support").length;

  return (
    <div className="space-y-12">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-[13px] text-body hover:text-ink">
        <ArrowLeft aria-hidden="true" size={14} /> Dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[13px] text-mute" translate="no">{issue.id}</span>
            <StatusBadge status={issue.status} />
            <PriorityBadge priority={issue.priority} score={issue.priority_score} />
            <CategoryBadge category={issue.category} />
          </div>
          <h1 className="t-title mt-3">{issue.title}</h1>
          <p className="mt-1 text-[14px] text-body">{issue.building}, {issue.floor}. Reported {formatDate(issue.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS[issue.status].map((s) => (
            <button key={s} type="button" onClick={() => move(s)} disabled={!!busy}
              className={`btn ${s === "Resolved" || (s === "In Progress" && issue.status !== "AI Verified") ? "btn-primary" : "btn-secondary"}`}>
              {busy === s && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />}
              {LABEL[s]}
            </button>
          ))}
        </div>
      </header>

      {actionError && <p role="alert" className="border-l-2 border-[var(--crit-fg)] pl-4 text-[14px] text-[var(--crit-fg)]">{actionError}</p>}

      {resolving && (
        <section aria-labelledby="resolve" className="reveal border-l-2 border-accent pl-5">
          <h2 id="resolve" className="t-sub">Resolve this ticket</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="remarks">What was done</label>
              <textarea id="remarks" name="remarks" className="field" autoComplete="off"
                placeholder="e.g. Replaced the leaking pipe section…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div>
              <span className="label">After photo <span className="font-normal text-mute">Optional</span></span>
              <label htmlFor="after" className="flex h-[88px] cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-dashed border-hairline-strong text-[14px] text-body hover:border-mute">
                <Camera aria-hidden="true" size={16} /> <span className="max-w-[24ch] truncate">{after ? after.name : "Add proof of the fix"}</span>
              </label>
              <input id="after" type="file" accept="image/*" className="sr-only" onChange={(e) => setAfter(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => move("Resolved")}>
              {busy && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />} Confirm resolution
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setResolving(false)}>Cancel</button>
          </div>
        </section>
      )}

      <LifecycleBar status={issue.status} />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section aria-labelledby="photos">
          <h2 id="photos" className="border-b border-ink pb-3 text-[15px] font-semibold">Before and after</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(issue.image_url)} alt={`Reported: ${issue.title}`} width={480} height={360}
                className="aspect-[4/3] w-full rounded-[4px] object-cover" />
              <figcaption className="t-caption mt-2">Reported</figcaption>
            </figure>
            <figure>
              {issue.resolution?.after_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img(issue.resolution.after_image_url)} alt="After the fix" width={480} height={360}
                  className="aspect-[4/3] w-full rounded-[4px] object-cover" />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center rounded-[4px] border border-dashed border-hairline-strong text-[13px] text-mute">
                  {issue.status === "Resolved" ? "No after photo" : "Awaiting fix"}
                </div>
              )}
              <figcaption className="t-caption mt-2">After</figcaption>
            </figure>
          </div>
          {issue.resolution && (
            <p className="mt-5 border-l-2 border-accent pl-4 text-[14px]">
              {issue.resolution.remarks || "Marked resolved."} <span className="t-caption">{formatDate(issue.resolution.created_at)}</span>
            </p>
          )}
          {issue.description && <p className="mt-5 text-[14px] text-body">Student note: &ldquo;{issue.description}&rdquo;</p>}
        </section>

        <section aria-labelledby="ai">
          <h2 id="ai" className="border-b border-ink pb-3 text-[15px] font-semibold">AI analysis</h2>
          <dl className="divide-y divide-hairline text-[14px]">
            {[
              ["Category", issue.category],
              ["Confidence", `${Math.round(issue.confidence * 100)}%`],
              ["Priority score", `${issue.priority_score}/100, ${issue.priority}`],
              ["Reports merged", supports ? `${supports}` : "None"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] py-2.5">
                <dt className="text-body">{k}</dt>
                <dd className="num font-medium">{v}</dd>
              </div>
            ))}
            <TeamRow issue={issue} onChange={setIssue} />
          </dl>
          <h3 className="mt-6 text-[13px] text-body">Why this priority</h3>
          <ul className="mt-1 divide-y divide-hairline">
            {issue.reasoning.map((r) => <li key={r} className="py-2 text-[14px]">{r}</li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="history">
        <h2 id="history" className="border-b border-ink pb-3 text-[15px] font-semibold">History</h2>
        <StatusTimeline history={issue.history} />
      </section>
    </div>
  );
}

/** Team assignment with an admin override of the AI routing. */
function TeamRow({ issue, onChange }: { issue: IssueDetail; onChange: (i: IssueDetail) => void }) {
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [dept, setDept] = useState(issue.department);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setEditing(true); setError(""); setDept(issue.department);
    if (!options.length) api.departmentNames().then(setOptions).catch((e) => setError(e.message));
  }

  async function save() {
    setBusy(true); setError("");
    try {
      onChange(await api.reroute(issue.id, dept, note));
      setEditing(false); setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[140px_1fr] py-2.5">
      <dt className="text-body">Team</dt>
      <dd>
        {!editing ? (
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-medium">{issue.department}</span>
            <button type="button" onClick={start} className="link text-[13px]">Change</button>
          </span>
        ) : (
          <div className="space-y-2">
            <label htmlFor="dept" className="sr-only">Department</label>
            <select id="dept" name="department" className="field" value={dept} onChange={(e) => setDept(e.target.value)}>
              {(options.length ? options : [issue.department]).map((d) => <option key={d}>{d}</option>)}
            </select>
            <label htmlFor="reroute-note" className="sr-only">Reason</label>
            <input id="reroute-note" name="note" className="field" placeholder="Reason, e.g. needs an outside vendor…"
              autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} />
            {error && <p role="alert" className="text-[13px] text-[var(--crit-fg)]">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || dept === issue.department} onClick={save}>
                {busy && <CircleNotch aria-hidden="true" size={14} className="animate-spin" />} Re-route
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </dd>
    </div>
  );
}
