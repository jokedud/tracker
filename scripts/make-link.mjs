#!/usr/bin/env node
// Usage: TRACKING_SECRET=... node scripts/make-link.mjs <base-url> <campaign> <destination-url> < recipients.txt
//    or: node scripts/make-link.mjs <base-url> <campaign> <destination-url> <recipient-id>
// Prints CSV: recipient,click_url,pixel_url
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const [base, campaign, dest, single] = process.argv.slice(2);
const key = process.env.TRACKING_SECRET;
if (!base || !campaign || !dest || !key) {
  console.error("usage: TRACKING_SECRET=... node scripts/make-link.mjs <base-url> <campaign> <destination-url> [recipient-id] (or recipients on stdin)");
  process.exit(1);
}
const sign = (kind, r, d = "") =>
  createHmac("sha256", key).update([kind, campaign, r, d].join("\n")).digest().subarray(0, 16).toString("base64url");

const recipients = single ? [single] : readFileSync(0, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const csv = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
console.log("recipient,click_url,pixel_url");
for (const r of recipients) {
  const path = `${encodeURIComponent(campaign)}/${encodeURIComponent(r)}`;
  const click = new URL(`/t/${path}`, base);
  click.searchParams.set("u", dest);
  click.searchParams.set("s", sign("click", r, dest));
  const pixel = new URL(`/o/${path}`, base);
  pixel.searchParams.set("s", sign("open", r));
  console.log([r, click, pixel].map((x) => csv(String(x))).join(","));
}
