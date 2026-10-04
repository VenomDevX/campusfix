export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Status = "Reported" | "AI Verified" | "Assigned" | "In Progress" | "Resolved" | "Reopened";

export interface Analysis {
  upload_id: string;
  image_url: string;
  category: string;
  confidence: number;
  priority: Priority;
  priority_score: number;
  department: string;
  duplicate_found: boolean;
  duplicate_issue_id: string | null;
  duplicate_title: string | null;
  duplicate_image_url: string | null;
  duplicate_support_count: number | null;
  similarity: number | null;
  image_similarity: number | null;
  reasoning: string[];
  pipeline_ms: number;
  model: string;
}

export interface Notifications {
  unread: number;
  items: { id: number; issue_id: string; message: string; created_at: string; read: boolean }[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  building: string;
  floor: string;
  priority: Priority;
  priority_score: number;
  status: Status;
  department: string;
  image_url: string;
  support_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IssueDetail extends Issue {
  reasoning: string[];
  history: { status: Status; note: string; created_at: string }[];
  reports: { kind: string; note: string; image_url: string | null; created_at: string }[];
  resolution: { remarks: string; after_image_url: string | null; created_at: string } | null;
}

export interface Insight {
  category: string;
  building: string;
  count: number;
  message: string;
}

export interface Overview {
  total_reports: number;
  total_issues: number;
  active_issues: number;
  critical_issues: number;
  resolved_issues: number;
  avg_resolution_hours: number;
  duplicates_merged: number;
  trend: { date: string; reported: number; resolved: number }[];
  insights: Insight[];
}

export type NameValue = { name: string; value: number };

export interface CategoryStats {
  by_category: NameValue[];
  by_priority: NameValue[];
  by_status: NameValue[];
  by_building: NameValue[];
}

export interface Hotspot {
  building: string;
  traffic: string;
  total: number;
  open: number;
  critical: number;
  level: "low" | "moderate" | "high" | "critical";
  top_category: string | null;
}

export interface DepartmentStat {
  department: string;
  open: number;
  resolved: number;
}
