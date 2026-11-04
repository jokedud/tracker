import { sql } from "@/lib/db.ts";
import { sanitizeClientInfo } from "@/lib/client-info.ts";
import { verify } from "@/lib/sign.ts";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 8192) return new Response(null, { status: 413 });
  let body: { id?: unknown; s?: unknown; d?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID_RE.test(id) || !verify(typeof body.s === "string" ? body.s : null, "beacon", id, "")) {
    return new Response(null, { status: 403 });
  }
  const data = sanitizeClientInfo(body.d);
  try {
    await sql()`INSERT INTO client_info (click_id, data) VALUES (${id}, ${sql().json(data)}) ON CONFLICT (click_id) DO NOTHING`;
  } catch (err) {
    console.error("failed to store client info", err);
  }
  return new Response(null, { status: 204 });
}
