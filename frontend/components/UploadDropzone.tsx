"use client";

import { Camera, X } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useMemo, useRef, useState } from "react";

const SAMPLES = [
  { file: "water_leak.jpg", label: "Water leak" },
  { file: "exposed_wiring.jpg", label: "Exposed wiring" },
  { file: "broken_chair.jpg", label: "Broken chair" },
  { file: "overflowing_dustbin.jpg", label: "Garbage" },
  { file: "cracked_floor.jpg", label: "Cracked floor" },
  { file: "damaged_switch.jpg", label: "Burnt switch" },
];

export default function UploadDropzone({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function pickSample(name: string) {
    const blob = await (await fetch(`/samples/${name}`)).blob();
    onFile(new File([blob], name, { type: "image/jpeg" }));
  }

  return (
    <div>
      <span className="label" id="photo-label">Photo</span>
      {preview ? (
        <figure className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected issue photo" width={800} height={600}
            className="aspect-[4/3] w-full rounded-[6px] object-cover" />
          <figcaption className="mt-2 flex items-center justify-between gap-3">
            <span className="t-caption min-w-0 truncate">{file?.name}</span>
            <button type="button" onClick={() => onFile(null)} className="btn btn-secondary btn-sm">
              <X aria-hidden="true" size={14} /> Remove
            </button>
          </figcaption>
        </figure>
      ) : (
        <button type="button" aria-labelledby="photo-label" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed transition-colors ${
            drag ? "border-ink bg-inset" : "border-hairline-strong hover:border-mute"
          }`}>
          <Camera aria-hidden="true" size={22} className="text-body" />
          <span className="text-[14px] font-medium">Drop a photo, or click to upload</span>
          <span className="text-[13px] text-mute">On a phone this opens the camera</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden aria-label="Upload photo"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />

      <p className="mt-5 text-[13px] text-body">Or use a sample</p>
      <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SAMPLES.map((s) => (
          <li key={s.file}>
            <button type="button" onClick={() => pickSample(s.file)} className="group block w-full text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/samples/${s.file}`} alt="" width={120} height={90} loading="lazy"
                className="aspect-[4/3] w-full rounded-[4px] object-cover opacity-90 transition-opacity group-hover:opacity-100" />
              <span className="mt-1 block truncate text-[12px] text-body group-hover:text-ink">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
