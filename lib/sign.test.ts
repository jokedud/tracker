import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedDestination, buildLinks, sign, verify } from "./sign.ts";
import { parseUserAgent } from "./ua.ts";
import { storedIp } from "./ip.ts";

const KEY = "test-secret-0123456789";

test("signature round-trips and binds every field", () => {
  const s = sign("click", "spring", "r1", "https://example.com/a", KEY);
  assert.ok(verify(s, "click", "spring", "r1", "https://example.com/a", KEY));
  assert.ok(!verify(s, "click", "spring", "r1", "https://evil.example/a", KEY));
  assert.ok(!verify(s, "click", "spring", "r2", "https://example.com/a", KEY));
  assert.ok(!verify(s, "open", "spring", "r1", "https://example.com/a", KEY));
  assert.ok(!verify(null, "click", "spring", "r1", "https://example.com/a", KEY));
});

test("destination validation", () => {
  assert.ok(allowedDestination("https://shop.example.com/x", "example.com"));
  assert.equal(allowedDestination("https://evil.com/x", "example.com"), null);
  assert.equal(allowedDestination("https://notexample.com/x", "example.com"), null);
  assert.equal(allowedDestination("javascript:alert(1)", ""), null);
  assert.equal(allowedDestination("//evil.com", ""), null);
  assert.ok(allowedDestination("https://anything.dev", ""));
});

test("buildLinks produces verifiable urls", () => {
  const { click, pixel } = buildLinks("https://t.example.com", "spring 26", "a@b.c", "https://example.com/?q=1&x=2", KEY);
  const u = new URL(click);
  assert.equal(u.pathname, "/t/spring%2026/a%40b.c");
  assert.equal(u.searchParams.get("u"), "https://example.com/?q=1&x=2");
  assert.ok(verify(u.searchParams.get("s"), "click", "spring 26", "a@b.c", "https://example.com/?q=1&x=2", KEY));
  assert.ok(verify(new URL(pixel).searchParams.get("s"), "open", "spring 26", "a@b.c", "", KEY));
});

test("user agent parsing", () => {
  const iphone = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1");
  assert.match(iphone.device, /mobile/);
  assert.match(iphone.os, /iOS/);
  const win = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
  assert.equal(win.device, "desktop");
  assert.match(win.browser, /Chrome 130/);
  assert.ok(parseUserAgent("curl/8.0").isBot);
  assert.equal(parseUserAgent("Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)").device, "Mail image proxy");
});

test("ip truncation", () => {
  assert.equal(storedIp("203.0.113.42", "truncate"), "203.0.113.0");
  assert.equal(storedIp("2001:db8:abcd:12::1", "truncate"), "2001:db8:abcd::");
  assert.equal(storedIp("203.0.113.42", "none"), null);
  assert.equal(storedIp("203.0.113.42", "full"), "203.0.113.42");
});

import { sanitizeClientInfo } from "./client-info.ts";
import { escapeHtml, interstitialHtml } from "./interstitial.ts";

test("client info sanitizer keeps only known, well-typed fields", () => {
  const raw = { screenWidth: 390, timezone: "America/Toronto", gpuRenderer: "Apple GPU", batteryLevel: 0.5, evil: "x", colorDepth: "24", languages: "a".repeat(500) };
  const on = sanitizeClientInfo(raw, true);
  assert.deepEqual(Object.keys(on).sort(), ["batteryLevel", "gpuRenderer", "languages", "screenWidth", "timezone"]);
  assert.equal((on.languages as string).length, 200);
  const off = sanitizeClientInfo(raw, false);
  assert.ok(!("gpuRenderer" in off) && !("batteryLevel" in off));
  assert.deepEqual(sanitizeClientInfo(null, true), {});
});

test("interstitial escapes the destination", () => {
  const html = interstitialHtml('https://ex.com/?a="><script>alert(1)</script>', "00000000-0000-0000-0000-000000000000", "sig", true);
  assert.ok(!html.includes('"><script>alert'));
  assert.ok(html.includes(escapeHtml('https://ex.com/?a="><script>')));
  assert.ok(!html.includes("</script>alert"));
});
