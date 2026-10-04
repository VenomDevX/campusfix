"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ApiError from "@/components/ApiError";
import IssueTable from "@/components/IssueTable";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import type { Issue } from "@/types";

function MyReports() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.myIssues().then(setIssues).catch((e) => setError(e.message)); }, []);

  const open = issues?.filter((i) => i.status !== "Resolved").length ?? 0;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-section">My reports</h1>
          <p className="mt-1 text-[14px] text-body">Issues you reported or added your voice to.</p>
        </div>
        <Link href="/report" className="btn btn-primary">Report an issue</Link>
      </div>
      <section className="mt-10 border-t border-ink">
        {error ? <div className="pt-6"><ApiError message={error} /></div>
          : !issues ? <p className="py-8 text-mute">Loading your reports…</p>
          : issues.length === 0 ? (
            <div className="py-12">
              <p className="font-medium">No reports yet.</p>
              <p className="mt-1 text-[14px] text-body">Spotted a leak, a broken chair or exposed wiring? Report it with a photo.</p>
            </div>
          ) : (
            <>
              <p className="t-caption num pt-3">{issues.length} total, {open} open</p>
              <IssueTable issues={issues} hrefBase="/track" caption="Your reports" />
            </>
          )}
      </section>
    </div>
  );
}

export default function MyReportsPage() {
  return <RequireAuth><MyReports /></RequireAuth>;
}
