import { createHmac, timingSafeEqual } from "node:crypto";

export type LinkKind = "click" | "open" | "beacon";

function secret(): string {
  const s = process.env.TRACKING_SECRET;
  if (!s || s.length < 16) throw new Error("TRACKING_SECRET must be set (16+ chars)");
  return s;
}

export function sign(kind: LinkKind, campaign: string, recipient: string, dest = "", key = secret()): string {
  return createHmac("sha256", key)
    .update([kind, campaign, recipient, dest].join("\n"))
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function verify(sig: string | null, kind: LinkKind, campaign: string, recipient: string, dest = "", key = secret()): boolean {
  if (!sig) return false;
  const expected = Buffer.from(sign(kind, campaign, recipient, dest, key));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function allowedDestination(raw: string, allowedHosts = process.env.ALLOWED_DEST_HOSTS ?? ""): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hosts = allowedHosts.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (hosts.length === 0) return url;
  const host = url.hostname.toLowerCase();
  return hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? url : null;
}

export function buildLinks(base: string, campaign: string, recipient: string, dest: string, key?: string) {
  const path = `${encodeURIComponent(campaign)}/${encodeURIComponent(recipient)}`;
  const click = new URL(`/t/${path}`, base);
  click.searchParams.set("u", dest);
  click.searchParams.set("s", sign("click", campaign, recipient, dest, key));
  const pixel = new URL(`/o/${path}`, base);
  pixel.searchParams.set("s", sign("open", campaign, recipient, "", key));
  return { click: click.toString(), pixel: pixel.toString() };
}
