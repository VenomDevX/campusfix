import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink" translate="no">
      <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-[4px] bg-ink">
        <span className="h-2 w-2 bg-canvas" />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">CampusFix</span>
    </Link>
  );
}
