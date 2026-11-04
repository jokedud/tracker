import { after, type NextRequest } from "next/server";
import { recordEvent } from "@/lib/record.ts";
import { verify } from "@/lib/sign.ts";

export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest, ctx: { params: Promise<{ campaign: string; recipient: string }> }) {
  const { campaign, recipient } = await ctx.params;
  if (verify(req.nextUrl.searchParams.get("s"), "open", campaign, recipient)) {
    const headers = new Headers(req.headers);
    after(() => recordEvent("open", campaign, recipient, headers));
  }
  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Expires: "0",
    },
  });
}
