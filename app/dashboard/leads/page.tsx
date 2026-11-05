import { sql } from "@/lib/db.ts";
import { leadsCsv, parseSort, sortLeads, timeAgo, toLead, type LeadRow, type LeadSort } from "@/lib/leads.ts";
import { CopyCsv } from "./copy-csv.tsx";

export const dynamic = "force-dynamic";

const SORTS: [LeadSort, string][] = [["score", "Score"], ["clicks", "Clicks"], ["recent", "Most recent"]];

export default async function HotLeads({ searchParams }: { searchParams: Promise<{ campaign?: string; sort?: string }> }) {
  const { campaign, sort: sortParam } = await searchParams;
  const sort = parseSort(sortParam);
  const db = sql();
  const filterCampaign = campaign ? db`AND campaign = ${campaign}` : db``;

  // Location, device and browser come from the latest click when there is one (opens are often mail proxies).
  const rows = await db<LeadRow[]>`
    SELECT recipient,
      array_agg(DISTINCT campaign) AS campaigns,
      count(*) FILTER (WHERE type = 'open')::int AS opens,
      count(*) FILTER (WHERE type = 'click')::int AS clicks,
      count(DISTINCT date_trunc('minute', created_at)) FILTER (WHERE type = 'open')::int AS open_minutes,
      count(DISTINCT date_trunc('minute', created_at)) FILTER (WHERE type = 'click')::int AS click_minutes,
      count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int AS active_days,
      min(created_at) AS first_seen,
      max(created_at) AS last_seen,
      (array_agg(country ORDER BY type = 'click' DESC, created_at DESC))[1] AS country,
      (array_agg(region ORDER BY type = 'click' DESC, created_at DESC))[1] AS region,
      (array_agg(city ORDER BY type = 'click' DESC, created_at DESC))[1] AS city,
      (array_agg(device ORDER BY type = 'click' DESC, created_at DESC))[1] AS device,
      (array_agg(browser ORDER BY type = 'click' DESC, created_at DESC))[1] AS browser
    FROM events WHERE NOT is_bot ${filterCampaign}
    GROUP BY recipient`;

  const leads = sortLeads(rows.map(toLead), sort).slice(0, 500);
  const now = new Date();
  const repeatClickers = leads.filter((l) => l.repeatClicker).length;
  const query = (s: LeadSort) => `/dashboard/leads?${new URLSearchParams({ ...(campaign ? { campaign } : {}), sort: s })}`;

  return (
    <main>
      <nav>
        <a href="/dashboard">All events</a>
        <a href="/dashboard/leads">Hot leads</a>
        <a href="/dashboard/links">Link builder</a>
      </nav>
      <h1>{campaign ? `Hot leads: ${campaign}` : "Hot leads"}</h1>
      <p className="muted">
        One row per recipient, bots/scanners excluded. Score: 1 per minute with an open + 3 per minute with a click + 5 per extra day engaged.{" "}
        <span className="hot-badge">Repeat clicker</span> = clicked at more than one moment ({repeatClickers} shown).
      </p>
      <div className="toolbar">
        <span className="muted">Sort by:</span>
        {SORTS.map(([s, label]) => (s === sort ? <strong key={s}>{label}</strong> : <a key={s} href={query(s)}>{label}</a>))}
        {campaign && <a href={`/dashboard/leads?sort=${sort}`}>All campaigns</a>}
        <CopyCsv csv={leadsCsv(leads)} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Recipient</th><th>Score</th><th>Campaign</th><th>Opens</th><th>Clicks</th><th>Days</th>
              <th>First seen</th><th>Last seen</th><th>Location</th><th>Device</th><th>Browser</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.recipient} className={l.repeatClicker ? "hot" : undefined}>
                <td>{l.recipient}{l.repeatClicker && <span className="hot-badge">Repeat clicker</span>}</td>
                <td>{l.score}</td>
                <td>
                  {l.campaigns.map((c) => (
                    <a key={c} className="tag" href={`/dashboard/leads?${new URLSearchParams({ campaign: c, sort })}`}>{c}</a>
                  ))}
                </td>
                <td>{l.opens}</td>
                <td>{l.clicks}</td>
                <td>{l.active_days}</td>
                <td title={l.first_seen.toISOString()}>{timeAgo(l.first_seen, now)}</td>
                <td title={l.last_seen.toISOString()}>{timeAgo(l.last_seen, now)}</td>
                <td>{l.location}</td>
                <td>{l.device}</td>
                <td>{l.browser}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 && <p className="muted">No engagement yet.</p>}
    </main>
  );
}
