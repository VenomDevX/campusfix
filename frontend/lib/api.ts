import type {
  Analysis, CategoryStats, DepartmentStat, Hotspot, Insight, Issue, IssueDetail, Notifications, Overview,
} from "@/types";
import { clearSession, type Session, type User } from "./auth";

// Same-origin by default: next.config.ts proxies /api and /uploads to the FastAPI server.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const BUILDINGS = ["Block A", "Block B", "Library", "Cafeteria", "Washroom Area", "Parking", "Lab Block"];
export const FLOORS = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Outdoor"];

export const img = (path: string | null | undefined) => (path ? `${API_URL}${path}` : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  // Session cookie is sent automatically (same origin). The custom header is the API's CSRF check.
  const headers = new Headers(init?.headers);
  headers.set("X-Requested-With", "campusfix");
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store", credentials: "same-origin", ...init, headers });
  } catch {
    throw new Error("Cannot reach CampusFix. Check your connection and try again.");
  }
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    // Session missing or expired: dropping it makes <RequireAuth> send the user to /login?next=…
    clearSession();
    throw new Error("Please log in to continue.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    if (typeof detail === "string") throw new Error(detail);
    // The proxy answers 5xx without a JSON body when FastAPI is not running.
    throw new Error(res.status >= 500 ? "The CampusFix API is not responding." : `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  login: (email: string, password: string) => request<Session>("/api/auth/login", json({ email, password })),
  signup: (name: string, email: string, password: string) => request<Session>("/api/auth/signup", json({ name, email, password })),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
  myIssues: () => request<Issue[]>("/api/issues/mine"),
  notifications: () => request<Notifications>("/api/notifications"),
  markNotificationsRead: () => request<void>("/api/notifications/read", { method: "POST" }),
  departmentNames: () => request<string[]>("/api/departments"),
  reroute: (id: string, department: string, note: string) =>
    request<IssueDetail>(`/api/issues/${id}/department`, { ...json({ department, note }), method: "PATCH" }),
  publicCampus: () => request<{ hotspots: Hotspot[]; insights: Insight[] }>("/api/public/campus"),
  analyze: (form: FormData) => request<Analysis>("/api/analyze", { method: "POST", body: form }),
  createIssue: (body: { upload_id: string; building: string; floor: string; description: string }) =>
    request<IssueDetail>("/api/issues", json(body)),
  support: (id: string, body: { upload_id?: string; note?: string }) =>
    request<IssueDetail>(`/api/issues/${id}/support`, json(body)),
  issues: (params = "") => request<Issue[]>(`/api/issues${params}`),
  issue: (id: string) => request<IssueDetail>(`/api/issues/${encodeURIComponent(id)}`),
  updateStatus: (id: string, form: FormData) =>
    request<IssueDetail>(`/api/issues/${id}/status`, { method: "PATCH", body: form }),
  overview: () => request<Overview>("/api/analytics/overview"),
  categories: () => request<CategoryStats>("/api/analytics/categories"),
  hotspots: () => request<Hotspot[]>("/api/analytics/hotspots"),
  departments: () => request<DepartmentStat[]>("/api/analytics/departments"),
};

export function timeAgo(iso: string) {
  // Backend returns naive UTC timestamps.
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatDate(iso: string) {
  return new Date(iso.endsWith("Z") ? iso : iso + "Z").toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** "…Recommended: inspect X." -> "Inspect X." */
export function recommendation(message: string) {
  const r = message.split("Recommended: ")[1];
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : message;
}
