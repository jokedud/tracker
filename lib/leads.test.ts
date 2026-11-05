import { test } from "node:test";
import assert from "node:assert/strict";
import { leadScore, leadsCsv, sortLeads, timeAgo, toLead, type LeadRow } from "./leads.ts";

const base: LeadRow = {
  recipient: "r", campaigns: ["spring"], opens: 0, clicks: 0, open_minutes: 0, click_minutes: 0, active_days: 1,
  first_seen: new Date("2026-11-01T10:00:00Z"), last_seen: new Date("2026-11-01T10:00:00Z"),
  country: "CA", region: "Ontario", city: "Toronto", device: "desktop", browser: "Chrome 130",
};

test("clicks outweigh opens and extra days outweigh bursts", () => {
  assert.ok(leadScore({ open_minutes: 0, click_minutes: 1, active_days: 1 }) > leadScore({ open_minutes: 1, click_minutes: 0, active_days: 1 }));
  const twoDays = leadScore({ open_minutes: 2, click_minutes: 0, active_days: 2 });
  const oneBurst = leadScore({ open_minutes: 1, click_minutes: 0, active_days: 1 });
  const twoMinutesSameDay = leadScore({ open_minutes: 2, click_minutes: 0, active_days: 1 });
  assert.ok(twoDays > twoMinutesSameDay && twoMinutesSameDay > oneBurst);
  assert.equal(leadScore({ open_minutes: 0, click_minutes: 0, active_days: 0 }), 0);
});

test("repeat clicker needs clicks in more than one minute", () => {
  assert.equal(toLead({ ...base, clicks: 3, click_minutes: 1 }).repeatClicker, false);
  assert.equal(toLead({ ...base, clicks: 2, click_minutes: 2 }).repeatClicker, true);
  assert.equal(toLead({ ...base, region: null }).location, "Toronto, CA");
});

test("sorting by score, clicks and recency", () => {
  const a = toLead({ ...base, recipient: "a", opens: 9, open_minutes: 9, last_seen: new Date("2026-11-01T00:00:00Z") });
  const b = toLead({ ...base, recipient: "b", clicks: 2, click_minutes: 2, last_seen: new Date("2026-11-02T00:00:00Z") });
  const c = toLead({ ...base, recipient: "c", opens: 1, open_minutes: 1, last_seen: new Date("2026-11-03T00:00:00Z") });
  assert.deepEqual(sortLeads([c, b, a], "score").map((l) => l.recipient), ["a", "b", "c"]);
  assert.deepEqual(sortLeads([c, a, b], "clicks").map((l) => l.recipient), ["b", "a", "c"]);
  assert.deepEqual(sortLeads([a, b, c], "recent").map((l) => l.recipient), ["c", "b", "a"]);
});

test("timeAgo", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  assert.equal(timeAgo(new Date("2026-11-05T11:59:30Z"), now), "just now");
  assert.equal(timeAgo(new Date("2026-11-05T11:15:00Z"), now), "45m ago");
  assert.equal(timeAgo(new Date("2026-11-05T10:00:00Z"), now), "2h ago");
  assert.equal(timeAgo(new Date("2026-11-02T12:00:00Z"), now), "3d ago");
  assert.equal(timeAgo(new Date("2026-08-01T12:00:00Z"), now), "3mo ago");
});

test("csv escapes quotes, commas and spreadsheet formulas", () => {
  const csv = leadsCsv([toLead({ ...base, recipient: "=HYPERLINK(\"x\")", city: "Paris, 11e" })]);
  const [header, row] = csv.trim().split("\n");
  assert.ok(header.startsWith("recipient,campaigns,score"));
  assert.ok(row.startsWith(`"'=HYPERLINK(""x"")",spring,0,`));
  assert.ok(row.includes(`"Paris, 11e, Ontario, CA"`));
});
