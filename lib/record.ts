import { sql } from "./db.ts";
import { lookupGeo } from "./geo.ts";
import { clientIp, storedIp } from "./ip.ts";
import { parseUserAgent } from "./ua.ts";

export async function recordEvent(
  type: "click" | "open",
  campaign: string,
  recipient: string,
  headers: Headers,
  destination: string | null = null,
  clickId: string | null = null,
) {
  const ip = clientIp(headers);
  const ua = headers.get("user-agent") ?? "";
  const parsed = parseUserAgent(ua);
  const geo = await lookupGeo(headers, ip);
  try {
    await sql()`
      INSERT INTO events (click_id, type, campaign, recipient, destination, ip, country, region, city, user_agent, device, os, browser, is_bot)
      VALUES (${clickId}, ${type}, ${campaign}, ${recipient}, ${destination}, ${storedIp(ip)}, ${geo.country}, ${geo.region}, ${geo.city},
              ${ua.slice(0, 512)}, ${parsed.device}, ${parsed.os}, ${parsed.browser}, ${parsed.isBot})`;
  } catch (err) {
    console.error("failed to record event", err);
  }
}
