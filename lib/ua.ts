import { UAParser } from "ua-parser-js";

const BOT_RE = /bot|crawl|spider|slurp|scanner|preview|barracuda|proofpoint|mimecast|python-requests|curl\/|wget|headless|go-http-client|okhttp|java\//i;
const PROXY_RE = /GoogleImageProxy|YahooMailProxy|ggpht\.com/i;

export type ParsedUA = { device: string; os: string; browser: string; isBot: boolean };

export function parseUserAgent(ua: string): ParsedUA {
  if (PROXY_RE.test(ua)) {
    return { device: "Mail image proxy", os: "unknown", browser: ua.match(PROXY_RE)?.[0] ?? "proxy", isBot: false };
  }
  const r = new UAParser(ua).getResult();
  const device = r.device.type
    ? [r.device.type, r.device.vendor, r.device.model].filter(Boolean).join(" ")
    : ua
      ? "desktop"
      : "unknown";
  const os = [r.os.name, r.os.version].filter(Boolean).join(" ") || "unknown";
  const browser = [r.browser.name, r.browser.major].filter(Boolean).join(" ") || "unknown";
  return { device, os, browser, isBot: !ua || BOT_RE.test(ua) };
}
