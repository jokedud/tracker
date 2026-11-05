import { sql, type EventRow } from "@/lib/db.ts";

export const dynamic = "force-dynamic";

type Summary = { campaign: string; opens: number; unique_opens: number; clicks: number; unique_clicks: number };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ campaign?: string; bots?: string }> }) {
  const { campaign, bots } = await searchParams;
  const showBots = bots === "1";
  const db = sql();
  const filterCampaign = campaign ? db`AND campaign = ${campaign}` : db``;
  const filterBots = showBots ? db`` : db`AND NOT is_bot`;

  const [events, summary] = await Promise.all([
    db<EventRow[]>`
      SELECT e.id, e.created_at, e.type, e.campaign, e.recipient, e.destination, e.ip, e.country, e.region, e.city,
             e.device, e.os, e.browser, e.is_bot, c.data AS client
      FROM events e LEFT JOIN client_info c ON c.click_id = e.click_id WHERE true ${filterCampaign} ${filterBots}
      ORDER BY e.created_at DESC LIMIT 500`,
    db<Summary[]>`
      SELECT campaign,
        count(*) FILTER (WHERE type = 'open')::int AS opens,
        count(DISTINCT recipient) FILTER (WHERE type = 'open')::int AS unique_opens,
        count(*) FILTER (WHERE type = 'click')::int AS clicks,
        count(DISTINCT recipient) FILTER (WHERE type = 'click')::int AS unique_clicks
      FROM events WHERE NOT is_bot
      GROUP BY campaign ORDER BY max(created_at) DESC LIMIT 20`,
  ]);

  return (
    <main>
      <nav>
        <a href="/dashboard">All events</a>
        <a href="/dashboard/leads">Hot leads</a>
        <a href="/dashboard/links">Link builder</a>
        <a href={`/dashboard?${new URLSearchParams({ ...(campaign ? { campaign } : {}), bots: showBots ? "0" : "1" })}`}>
          {showBots ? "Hide" : "Show"} bots/scanners
        </a>
      </nav>
      <h1>{campaign ? `Campaign: ${campaign}` : "Events"}</h1>
      <div className="cards">
        {summary.map((s) => (
          <a key={s.campaign} className="card" href={`/dashboard?campaign=${encodeURIComponent(s.campaign)}`}>
            <strong>{s.campaign}</strong>
            <div className="muted">
              {s.unique_opens} opened ({s.opens} opens) · {s.unique_clicks} clicked ({s.clicks} clicks)
            </div>
          </a>
        ))}
      </div>
      <p className="muted">Latest 500 events. Open counts are approximate: image blocking hides opens, and mail privacy proxies (Apple MPP, Gmail) can fire or mask them.</p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th><th>Type</th><th>Campaign</th><th>Recipient</th><th>Country</th><th>Region</th><th>City</th>
              <th>Device</th><th>OS</th><th>Browser</th><th>IP</th><th>Destination</th><th>Screen</th><th>Timezone</th><th>Languages</th><th>Browser details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className={e.is_bot ? "bot" : undefined}>
                <td>{e.created_at.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td>{e.type}{e.is_bot ? " (bot)" : ""}</td>
                <td>{e.campaign}</td>
                <td>{e.recipient}</td>
                <td>{e.country ?? ""}</td>
                <td>{e.region ?? ""}</td>
                <td>{e.city ?? ""}</td>
                <td>{e.device}</td>
                <td>{e.os}</td>
                <td>{e.browser}</td>
                <td>{e.ip ?? ""}</td>
                <td>{e.destination ?? ""}</td>
                <td>{e.client?.screenWidth ? `${e.client.screenWidth}x${e.client.screenHeight} @${e.client.pixelRatio}x` : ""}</td>
                <td>{e.client?.timezone ?? ""}</td>
                <td>{e.client?.languages ?? ""}</td>
                <td>
                  {e.client && (
                    <details>
                      <summary>{Object.keys(e.client).length} fields</summary>
                      <pre>{JSON.stringify(e.client, null, 1)}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
