import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-32 sm:px-6">
      <p className="t-caption">404</p>
      <h1 className="t-section mt-3">This page does not exist.</h1>
      <p className="mt-3 text-body">Check the address, or start from a known place.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-primary">Go home</Link>
        <Link href="/admin" className="btn btn-secondary">Open dashboard</Link>
      </div>
    </div>
  );
}
