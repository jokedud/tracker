export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return headers.get("x-real-ip");
}

export function storedIp(ip: string | null, mode = process.env.IP_MODE ?? "full"): string | null {
  if (!ip || mode === "none") return null;
  if (mode !== "truncate") return ip;
  if (ip.includes(".") && !ip.includes(":")) return ip.split(".").slice(0, 3).concat("0").join(".");
  return ip.split(":").slice(0, 3).join(":") + "::";
}

export function isPrivateIp(ip: string): boolean {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip);
}
