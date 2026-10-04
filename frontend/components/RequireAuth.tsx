"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggingOut, useSession } from "@/lib/auth";

/** Client-side gate. The API enforces the same rules, this just keeps the UI honest. */
export default function RequireAuth({ role, children }: { role?: "admin"; children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    // A deliberate logout goes home; an expired or missing session goes to login and back.
    if (session === null) router.replace(isLoggingOut() ? "/" : `/login?next=${encodeURIComponent(path)}`);
  }, [session, path, router]);

  if (!session) {
    return (
      <div aria-busy="true" className="mx-auto max-w-[1200px] space-y-4 px-4 py-12 sm:px-6">
        <div className="h-9 w-56 rounded-[4px] bg-inset" />
        <div className="h-4 w-80 rounded-[4px] bg-inset" />
      </div>
    );
  }
  if (role && session.user.role !== role) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <h1 className="t-section">Admins only.</h1>
        <p className="mt-2 text-body">You are signed in as a student. Log in with an admin account to open this page.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/report" className="btn btn-primary">Report an issue</Link>
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-secondary">Switch account</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
