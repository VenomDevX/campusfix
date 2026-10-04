"use client";

import { Check, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";

const STEPS = ["Validating image", "Classifying issue", "Checking for duplicates", "Scoring priority", "Routing to department"];

/** Functional feedback while /api/analyze runs. */
export default function PipelineProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 380);
    return () => clearInterval(t);
  }, []);
  return (
    <section aria-live="polite" className="border-t border-ink pt-3">
      <h2 className="text-[14px] font-medium">Analyzing…</h2>
      <ol className="mt-3 space-y-2 font-mono text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 ${i <= step ? "text-ink" : "text-mute"}`}>
            {i < step ? <Check aria-hidden="true" size={14} />
              : i === step ? <CircleNotch aria-hidden="true" size={14} className="animate-spin" />
              : <span aria-hidden="true" className="h-3.5 w-3.5" />}
            {s}{i === step ? "…" : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
