import postgres from "postgres";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

export function sql() {
  if (!globalThis.__sql) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalThis.__sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20 });
  }
  return globalThis.__sql;
}

export type EventRow = {
  id: string;
  created_at: Date;
  type: "click" | "open";
  campaign: string;
  recipient: string;
  destination: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  is_bot: boolean;
  client: Record<string, string | number | boolean> | null;
};
