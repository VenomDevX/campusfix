"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Hotspot, Insight } from "@/types";
import { HotspotList } from "./HotspotMap";

/** Live slice of the admin view for the landing page. Renders nothing if the API is down. */
export default function LiveCampus() {
  const [data, setData] = useState<{ hotspots: Hotspot[]; insights: Insight[] } | null>(null);
  useEffect(() => {
    api.publicCampus()
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data) return null;
  return (
    <div className="reveal">
      <p className="t-caption mb-3">Live from the campus</p>
      <HotspotList data={data.hotspots.slice(0, 5)} />
      {data.insights[0] && (
        <p className="mt-5 border-l-2 border-[var(--high-fg)] pl-4 text-[14px] text-body">{data.insights[0].message}</p>
      )}
    </div>
  );
}
