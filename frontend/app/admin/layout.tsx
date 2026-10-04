import RequireAuth from "@/components/RequireAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="admin">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">{children}</div>
    </RequireAuth>
  );
}
