"use client";

import RequireAuth from "@/components/RequireAuth";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AnalysisCard from "@/components/AnalysisCard";
import DuplicateAlert from "@/components/DuplicateAlert";
import PipelineProgress from "@/components/PipelineProgress";
import UploadDropzone from "@/components/UploadDropzone";
import { api, BUILDINGS, FLOORS } from "@/lib/api";
import type { Analysis } from "@/types";

const MIN_ANIMATION_MS = 1900; // lets each pipeline stage register visually; real latency is shown in the result

function ReportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState(FLOORS[0]);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFile(null); setAnalysis(null); setDescription(""); setError("");
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Add a photo of the issue first.");
    if (!building) return setError("Choose where the issue is.");
    setError(""); setAnalysis(null); setAnalyzing(true);
    const form = new FormData();
    form.append("image", file);
    form.append("building", building);
    form.append("floor", floor);
    form.append("description", description);
    try {
      const [res] = await Promise.all([api.analyze(form), new Promise((r) => setTimeout(r, MIN_ANIMATION_MS))]);
      setAnalysis(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirm() {
    if (!analysis) return;
    setBusy(true); setError("");
    try {
      const issue = await api.createIssue({ upload_id: analysis.upload_id, building, floor, description });
      router.push(`/track/${issue.id}?new=1`);
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  async function support() {
    if (!analysis?.duplicate_issue_id) return;
    setBusy(true); setError("");
    try {
      await api.support(analysis.duplicate_issue_id, { upload_id: analysis.upload_id, note: description });
      router.push(`/track/${analysis.duplicate_issue_id}?supported=1`);
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      <h1 className="t-section">Report an issue</h1>
      <p className="mt-2 max-w-[56ch] text-body">Add a photo and where it is. The analysis shows the category, urgency, any matching report and the team it goes to.</p>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <form onSubmit={analyze} className="space-y-6" noValidate>
          <UploadDropzone file={file} onFile={(f) => { setFile(f); setAnalysis(null); setError(""); }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="building">Location</label>
              <select id="building" name="building" className="field" value={building} required
                onChange={(e) => { setBuilding(e.target.value); setAnalysis(null); }}>
                <option value="">Choose a building…</option>
                {BUILDINGS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="floor">Floor</label>
              <select id="floor" name="floor" className="field" value={floor} onChange={(e) => setFloor(e.target.value)}>
                {FLOORS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="desc">What did you see? <span className="font-normal text-mute">Optional</span></label>
            <textarea id="desc" name="description" className="field" maxLength={1000} autoComplete="off"
              placeholder="e.g. Water leaking under the washroom sink…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p role="alert" className="border-l-2 border-[var(--crit-fg)] pl-3 text-[14px] text-[var(--crit-fg)]">{error}</p>}
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={analyzing}>
            {analyzing && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />}
            {analyzing ? "Analyzing…" : "Analyze photo"}
          </button>
        </form>

        <div className="space-y-10">
          {analyzing && <PipelineProgress />}
          {analysis && !analyzing && (
            <div className="reveal space-y-10">
              <AnalysisCard a={analysis} />
              {analysis.duplicate_found ? (
                <DuplicateAlert a={analysis} busy={busy} onSupport={support} onCreateNew={confirm} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
                  <p className="text-[14px] text-body">No matching open report. This will be a new ticket.</p>
                  <div className="flex gap-3">
                    <button type="button" className="btn btn-secondary" onClick={reset} disabled={busy}>Start over</button>
                    <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
                      {busy && <CircleNotch aria-hidden="true" size={16} className="animate-spin" />} Create ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!analysis && !analyzing && (
            <div className="border-t border-hairline pt-4">
              <p className="text-[14px] text-mute">The analysis appears here once you analyze a photo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportRoute() {
  return <RequireAuth><ReportPage /></RequireAuth>;
}
