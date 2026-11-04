import { randomUUID } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { detailedEnabled } from "@/lib/client-info.ts";
import { interstitialHtml } from "@/lib/interstitial.ts";
import { recordEvent } from "@/lib/record.ts";
import { allowedDestination, sign, verify } from "@/lib/sign.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ campaign: string; recipient: string }> }) {
  const { campaign, recipient } = await ctx.params;
  const dest = req.nextUrl.searchParams.get("u") ?? "";
  const url = allowedDestination(dest);
  if (!url || !verify(req.nextUrl.searchParams.get("s"), "click", campaign, recipient, dest)) {
    return new Response("Invalid or tampered link", { status: 400 });
  }
  const clickId = randomUUID();
  const headers = new Headers(req.headers);
  after(() => recordEvent("click", campaign, recipient, headers, url.toString(), clickId));
  return new Response(interstitialHtml(url.toString(), clickId, sign("beacon", clickId, ""), detailedEnabled()), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
