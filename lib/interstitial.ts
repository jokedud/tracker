export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function jsonForScript(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

// Client-side collector: posts a beacon, then redirects. If JS is off, the meta refresh / link still redirect.
const COLLECTOR = `
(function (cfg) {
  var done = false;
  function go() { if (!done) { done = true; location.replace(cfg.dest); } }
  setTimeout(go, 800);
  try {
    var n = navigator, s = screen, d = {};
    var gpc = n.globalPrivacyControl === true;
    d.screenWidth = s.width; d.screenHeight = s.height;
    d.availWidth = s.availWidth; d.availHeight = s.availHeight;
    d.viewportWidth = innerWidth; d.viewportHeight = innerHeight;
    d.pixelRatio = devicePixelRatio; d.colorDepth = s.colorDepth;
    d.orientation = s.orientation && s.orientation.type;
    try { d.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    d.tzOffsetMin = -new Date().getTimezoneOffset();
    d.languages = (n.languages || [n.language]).join(",");
    d.platform = (n.userAgentData && n.userAgentData.platform) || n.platform;
    d.maxTouchPoints = n.maxTouchPoints;
    d.colorScheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var c = n.connection;
    if (c) { d.connectionType = c.effectiveType; d.downlinkMbps = c.downlink; d.rttMs = c.rtt; d.saveData = c.saveData; }
    d.cookieEnabled = n.cookieEnabled;
    d.doNotTrack = n.doNotTrack === "1";
    d.globalPrivacyControl = gpc;
    var tasks = [];
    if (cfg.detailed && !gpc) {
      d.hardwareConcurrency = n.hardwareConcurrency;
      d.deviceMemoryGb = n.deviceMemory;
      try {
        var gl = document.createElement("canvas").getContext("webgl");
        var ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) { d.gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL); d.gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); }
      } catch (e) {}
      if (n.getBattery) tasks.push(n.getBattery().then(function (b) { d.batteryLevel = b.level; d.batteryCharging = b.charging; }).catch(function () {}));
    }
    var timeout = new Promise(function (r) { setTimeout(r, 300); });
    Promise.race([Promise.all(tasks), timeout]).then(function () {
      var body = JSON.stringify({ id: cfg.id, s: cfg.sig, d: d });
      if (!(n.sendBeacon && n.sendBeacon("/api/ci", new Blob([body], { type: "text/plain" })))) {
        fetch("/api/ci", { method: "POST", body: body, keepalive: true }).catch(function () {});
      }
      go();
    });
  } catch (e) { go(); }
})(__CFG__);
`;

export function interstitialHtml(dest: string, clickId: string, sig: string, detailed: boolean): string {
  const href = escapeHtml(dest);
  const script = COLLECTOR.replace("__CFG__", jsonForScript({ dest, id: clickId, sig, detailed }));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<meta http-equiv="refresh" content="2;url=${href}">
<title>Redirecting…</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px">
<p>Redirecting… <a href="${href}">Continue</a></p>
<script>${script}</script>
</body></html>`;
}
