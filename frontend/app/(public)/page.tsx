import Link from "next/link";
import AnalysisCard from "@/components/AnalysisCard";
import CampusIllustration from "@/components/CampusIllustration";
import LiveCampus from "@/components/LiveCampus";
import type { Analysis } from "@/types";

const EXAMPLE: Analysis = {
  upload_id: "", image_url: "", category: "Electrical", confidence: 0.87, priority: "Critical", priority_score: 75,
  department: "Electrical Maintenance", duplicate_found: false, duplicate_issue_id: null, duplicate_title: null,
  duplicate_image_url: null, duplicate_support_count: null, similarity: null, image_similarity: null, pipeline_ms: 29,
  model: "CLIP ViT-H/14 · cuda",
  reasoning: ["Vision model: electrical issue in photo (99%)", "Cafeteria is a high-traffic area", "Potential safety risk (sparks reported)"],
};

const STEPS = [
  { name: "Validate", text: "Rejects blurry, tiny or non-image uploads and strips metadata." },
  { name: "Classify", text: "Reads the photo and the note to name the issue and its confidence." },
  { name: "Deduplicate", text: "Compares image embeddings against open tickets nearby." },
  { name: "Prioritise", text: "Scores urgency from severity, traffic, safety and reports." },
  { name: "Route", text: "Sends the ticket straight to the team that fixes it." },
];

const COMPARE = [
  ["Free-text complaints sorted by hand", "Classified from the photo"],
  ["The same leak reported fifteen times", "Duplicates merged into one ticket"],
  ["First come, first served", "Safety-aware priority queue"],
  ["Admin forwards every message", "Routed to the right team instantly"],
  ["No way to know if it was fixed", "Live status with an after-photo"],
  ["A spreadsheet, at best", "Hotspots and recurring-fault alerts"],
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      {/* Hero fills the first screen (viewport minus the 64px header); the next section starts below the fold. */}
      <section className="grid grid-cols-1 min-h-[calc(100dvh-4rem)] content-center items-center gap-12 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="reveal">
          <h1 className="t-hero max-w-[14ch]">Campus maintenance, triaged from one photo.</h1>
          <p className="mt-5 max-w-[46ch] text-[18px] leading-7 text-body">
            Students snap the problem. CampusFix classifies it, merges duplicates, scores urgency and routes it to the right team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/report" className="btn btn-primary">Report an issue</Link>
            <Link href="/login" className="btn btn-secondary">Try a demo account</Link>
          </div>
        </div>
        <CampusIllustration className="reveal w-full text-ink lg:-mr-6 lg:w-[calc(100%+1.5rem)]" />
      </section>

      <section className="grid grid-cols-1 gap-10 border-t border-hairline py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16" aria-labelledby="example">
        <div>
          <h2 id="example" className="t-section"><span className="block">One photo in.</span><span className="block">A routed ticket out.</span></h2>
          <p className="mt-4 max-w-[46ch] text-body">
            This is the real result for exposed wiring reported at the Cafeteria: category, urgency with reasons, and the team it goes to.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/samples/exposed_wiring.jpg" alt="Exposed wiring hanging from a ceiling panel" width={800} height={600} loading="lazy"
            className="mt-8 aspect-[4/3] w-full max-w-[360px] rounded-[4px] object-cover" />
        </div>
        <AnalysisCard a={EXAMPLE} />
      </section>

      <section className="border-t border-hairline py-16 md:py-20" aria-labelledby="how">
        <p className="t-caption">How a report moves</p>
        <h2 id="how" className="t-section mt-3 max-w-[22ch]">Five checks run in under a second.</h2>
        <ol className="mt-10 grid grid-cols-1 border-t border-hairline sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-hairline">
          {STEPS.map((s) => (
            <li key={s.name} className="border-b border-hairline py-5 lg:border-b-0 lg:px-5 lg:first:pl-0">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{s.name}</h3>
              <p className="mt-2 text-[14px] text-body">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-12 border-t border-hairline py-16 md:py-20 lg:grid-cols-2" aria-labelledby="team">
        <div>
          <h2 id="team" className="t-section max-w-[18ch]">The maintenance team sees what matters first.</h2>
          <p className="mt-4 max-w-[52ch] text-body">
            A queue ordered by risk, a map of where faults cluster, and alerts when the same problem keeps coming back to one building.
          </p>
          <Link href="/admin/analytics" className="link mt-6 inline-block text-[15px]">See campus analytics</Link>
        </div>
        <LiveCampus />
      </section>

      <section className="border-t border-hairline py-16 md:py-20" aria-labelledby="compare">
        <h2 id="compare" className="t-section">Why not a Google Form?</h2>
        <p className="mt-3 max-w-[52ch] text-body">A form collects complaints. CampusFix turns them into a maintenance plan.</p>
        <table className="mt-10 w-full text-[15px]">
          <thead>
            <tr className="border-b border-ink text-left">
              <th scope="col" className="w-1/2 py-3 pr-6 font-mono text-[12px] font-normal text-mute">Google Form or register</th>
              <th scope="col" className="py-3 font-mono text-[12px] font-normal text-mute">CampusFix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {COMPARE.map(([a, b]) => (
              <tr key={a}>
                <td className="py-3.5 pr-6 text-mute">{a}</td>
                <td className="py-3.5 font-medium">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-8 text-[13px] text-body">
        <p>CampusFix AI. Built for ReThink&apos;26 at Maharaja Agrasen College.</p>
      </footer>
    </div>
  );
}
