"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackLookup() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
      <div className="max-w-md">
        <h1 className="t-section">Track a report</h1>
        <p className="mt-2 text-body">Enter the ticket ID you received after reporting.</p>
        <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (id.trim()) router.push(`/track/${id.trim().toUpperCase()}`); }}>
          <label htmlFor="ticket" className="sr-only">Ticket ID</label>
          <input id="ticket" name="ticket" className="field font-mono uppercase" placeholder="CF-1001…" autoComplete="off"
            spellCheck={false} value={id} onChange={(e) => setId(e.target.value)} />
          <button type="submit" className="btn btn-primary">Track</button>
        </form>
      </div>
    </div>
  );
}
