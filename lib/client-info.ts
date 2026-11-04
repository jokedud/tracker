type FieldType = "number" | "string" | "boolean";

export const BASIC_FIELDS: Record<string, FieldType> = {
  screenWidth: "number",
  screenHeight: "number",
  availWidth: "number",
  availHeight: "number",
  viewportWidth: "number",
  viewportHeight: "number",
  pixelRatio: "number",
  colorDepth: "number",
  orientation: "string",
  timezone: "string",
  tzOffsetMin: "number",
  languages: "string",
  platform: "string",
  maxTouchPoints: "number",
  colorScheme: "string",
  connectionType: "string",
  downlinkMbps: "number",
  rttMs: "number",
  saveData: "boolean",
  cookieEnabled: "boolean",
  doNotTrack: "boolean",
  globalPrivacyControl: "boolean",
};

export const DETAILED_FIELDS: Record<string, FieldType> = {
  hardwareConcurrency: "number",
  deviceMemoryGb: "number",
  gpuVendor: "string",
  gpuRenderer: "string",
  batteryLevel: "number",
  batteryCharging: "boolean",
};

export function detailedEnabled(flag = process.env.DETAILED_FINGERPRINT ?? "on"): boolean {
  return !["off", "0", "false", "no"].includes(flag.trim().toLowerCase());
}

export function sanitizeClientInfo(raw: unknown, detailed = detailedEnabled()): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== "object") return out;
  const fields = detailed ? { ...BASIC_FIELDS, ...DETAILED_FIELDS } : BASIC_FIELDS;
  for (const [key, type] of Object.entries(fields)) {
    const v = (raw as Record<string, unknown>)[key];
    if (type === "number" && typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (type === "boolean" && typeof v === "boolean") out[key] = v;
    else if (type === "string" && typeof v === "string" && v) out[key] = v.slice(0, 200);
  }
  return out;
}
