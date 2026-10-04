"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import StatusTimeline, { LifecycleBar } from "@/components/StatusTimeline";
import { api, img } from "@/lib/api";
import type { IssueDetail } from "@/types";

function TrackIssue() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState("");
  const q = useSearchParams();
  const banner = q.has("new") ? "new" : q.has("supported") ? "supported" : null;

  useEffect(() => {
    api.issue(id).then(setIssue).catch((e) => setError(e.message));
  }, [id]);

  if (error) return (
    <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
      <h1 className="t-section">Ticket not found.</h1>
      <p className="mt-2 text-body">{error} Check the ID and try again.</p>
      <Link href="/track" className="btn btn-secondary mt-8">Try another ID</Link>
    </div>
  );
  if (!issue) return <div className="mx-auto max-w-[1200px] px-4 py-20 text-mute sm:px-6">Loading ticket…</div>;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      {banner && (
        <p role="status" className="reveal mb-10 border-l-2 border-accent pl-4 text-[15px]">
          {banner === "new"
            ? <>Ticket <b className="font-mono font-medium">{issue.id}</b> was created and sent to {issue.department}. Keep this ID to track it.</>
            : <>Your report was added to <b className="font-mono font-medium">{issue.id}</b>. {issue.support_count + 1} students have reported this, so it is now {issue.priority}.</>}
        </p>
      )}

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[320px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(issue.image_url)} alt={issue.title} width={640} height={480}
          className="aspect-[4/3] w-full rounded-[4px] object-cover" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[13px] text-mute" translate="no">{issue.id}</span>
            <StatusBadge status={issue.status} />
            <PriorityBadge priority={issue.priority} score={issue.priority_score} />
            <CategoryBadge category={issue.category} />
          </div>
          <h1 className="t-title mt-3">{issue.title}</h1>
          <p className="mt-1 text-[14px] text-body">{issue.building}, {issue.floor}. Team: {issue.department}</p>
          {issue.description && <p className="mt-4 max-w-[60ch] text-[15px]">&ldquo;{issue.description}&rdquo;</p>}
          <div className="mt-8"><LifecycleBar status={issue.status} /></div>
        </div>
      </div>

      <section className="mt-14 border-t border-hairline pt-6" aria-labelledby="updates">
        <h2 id="updates" className="t-sub">Updates</h2>
        <div className="mt-3"><StatusTimeline history={issue.history} /></div>
      </section>
    </div>
  );
}

export default function TrackIssuePage() {
  return <RequireAuth><TrackIssue /></RequireAuth>;
}
