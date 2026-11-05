import { headers } from "next/headers";
import { allowedDestination, buildLinks } from "@/lib/sign.ts";

export const dynamic = "force-dynamic";

export default async function LinkBuilder({ searchParams }: { searchParams: Promise<{ campaign?: string; recipient?: string; u?: string }> }) {
  const { campaign = "", recipient = "", u = "" } = await searchParams;
  const h = await headers();
  const base = process.env.PUBLIC_BASE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const ready = campaign && recipient && u;
  const valid = ready ? allowedDestination(u) : null;
  const links = valid ? buildLinks(base, campaign, recipient, u) : null;

  return (
    <main>
      <nav>
        <a href="/dashboard">All events</a>
        <a href="/dashboard/leads">Hot leads</a>
        <a href="/dashboard/links">Link builder</a>
      </nav>
      <h1>Link builder</h1>
      <form method="get">
        <label>Campaign<br /><input name="campaign" defaultValue={campaign} required /></label>
        <label>Recipient ID<br /><input name="recipient" defaultValue={recipient} required /></label>
        <label>Destination URL<br /><input name="u" defaultValue={u} size={50} required placeholder="https://yourshop.com/sale" /></label>
        <button type="submit">Build</button>
      </form>
      {ready && !valid && <p style={{ color: "crimson" }}>Destination must be an http(s) URL on an allowed host (ALLOWED_DEST_HOSTS).</p>}
      {links && (
        <>
          <h3>Tracked link</h3>
          <textarea readOnly rows={2} value={links.click} />
          <h3>Open pixel (paste into the email HTML)</h3>
          <textarea readOnly rows={2} value={`<img src="${links.pixel}" width="1" height="1" alt="" style="display:block;border:0" />`} />
        </>
      )}
      <p className="muted">For bulk sends, use <code>npm run link</code> (see README) or replicate the HMAC in your mail tool.</p>
    </main>
  );
}
