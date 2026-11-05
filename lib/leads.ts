export type LeadRow = {
  recipient: string;
  campaigns: string[];
  opens: number;
  clicks: number;
  open_minutes: number;
  click_minutes: number;
  active_days: number;
  first_seen: Date;
  last_seen: Date;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
};

export type Lead = LeadRow & { score: number; repeatClicker: boolean; location: string };

export type LeadSort = "score" | "clicks" | "recent";

// Events in the same minute count once (pixel prefetch, double clicks); each extra day counts more than any burst.
export const WEIGHTS = { openMinute: 1, clickMinute: 3, extraDay: 5 };

export function leadScore(r: Pick<LeadRow, "open_minutes" | "click_minutes" | "active_days">): number {
  return r.open_minutes * WEIGHTS.openMinute + r.click_minutes * WEIGHTS.clickMinute + Math.max(0, r.active_days - 1) * WEIGHTS.extraDay;
}

export function toLead(r: LeadRow): Lead {
  return {
    ...r,
    score: leadScore(r),
    repeatClicker: r.click_minutes > 1,
    location: [r.city, r.region, r.country].filter(Boolean).join(", "),
  };
}

export function parseSort(s: string | undefined): LeadSort {
  return s === "clicks" || s === "recent" ? s : "score";
}

export function sortLeads(leads: Lead[], sort: LeadSort): Lead[] {
  const recent = (a: Lead, b: Lead) => b.last_seen.getTime() - a.last_seen.getTime();
  const by: Record<LeadSort, (a: Lead, b: Lead) => number> = {
    score: (a, b) => b.score - a.score || b.clicks - a.clicks || recent(a, b),
    clicks: (a, b) => b.clicks - a.clicks || b.score - a.score || recent(a, b),
    recent,
  };
  return [...leads].sort(by[sort]);
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "m"], [3600, "h"], [86400, "d"], [86400 * 30, "mo"], [86400 * 365, "y"]];
  let unit = units[0];
  for (const u of units) if (s >= u[0]) unit = u;
  return `${Math.floor(s / unit[0])}${unit[1]} ago`;
}

function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsCsv(leads: Lead[]): string {
  const header = ["recipient", "campaigns", "score", "opens", "clicks", "active_days", "first_seen", "last_seen", "location", "device", "browser"];
  const rows = leads.map((l) => [
    l.recipient, l.campaigns.join(" "), l.score, l.opens, l.clicks, l.active_days,
    l.first_seen.toISOString(), l.last_seen.toISOString(), l.location, l.device ?? "", l.browser ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
