import { isPrivateIp } from "./ip.ts";

export type Geo = { country: string | null; region: string | null; city: string | null };

function decode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function vercelGeo(headers: Headers): Geo | null {
  const country = headers.get("x-vercel-ip-country");
  if (!country) return null;
  return {
    country,
    region: decode(headers.get("x-vercel-ip-country-region")),
    city: decode(headers.get("x-vercel-ip-city")),
  };
}

export async function lookupGeo(headers: Headers, ip: string | null): Promise<Geo> {
  const fromVercel = vercelGeo(headers);
  if (fromVercel) return fromVercel;
  const empty = { country: null, region: null, city: null };
  if (!ip || isPrivateIp(ip) || (process.env.GEO_FALLBACK ?? "ipwhois") !== "ipwhois") return empty;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,region,city`, {
      signal: AbortSignal.timeout(2000),
    });
    const j = (await res.json()) as { success?: boolean; country_code?: string; region?: string; city?: string };
    if (!j.success) return empty;
    return { country: j.country_code ?? null, region: j.region ?? null, city: j.city ?? null };
  } catch {
    return empty;
  }
}
