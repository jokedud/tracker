# Email tracker

Self-hosted open and click tracking for your own business emails, the same mechanism Mailchimp and HubSpot use: a 1x1 open pixel and a signed redirect link. It runs as a Next.js app on Vercel with Postgres storage and a password-protected dashboard.

Each event records the timestamp, campaign, recipient ID, IP, country/region/city (from Vercel geo headers, with a free fallback lookup), device, OS and browser (from the user agent). Link clicks also record browser-side details from a short redirect page (see [Click page data](#click-page-data)).

## How it works

| Endpoint | Purpose |
| --- | --- |
| `GET /t/<campaign>/<recipient>?u=<destination>&s=<sig>` | Click link. Checks the HMAC signature (so it can't be used as an open redirect), logs the click, serves a very short redirect page that sends browser details, then forwards to the destination. If JavaScript is off, a meta refresh and a "Continue" link still redirect. |
| `GET /o/<campaign>/<recipient>?s=<sig>` | Open pixel. Always returns a 1x1 transparent GIF and logs an open when the signature is valid. |
| `POST /api/ci` | Beacon from the click page (signed per click, whitelisted fields only, 8 KB max). |
| `/dashboard` | Events table, per-campaign open/click counts, campaign filter, bot/scanner toggle. HTTP Basic auth with `DASHBOARD_PASSWORD`. |
| `/dashboard/links` | Builds a signed link and pixel tag for one recipient. |

The signature is `base64url(HMAC-SHA256(TRACKING_SECRET, kind \n campaign \n recipient \n destination))` truncated to 16 bytes. Any change to the campaign, recipient or destination invalidates the link. You can also restrict destinations to your own domains with `ALLOWED_DEST_HOSTS`.

## Storage

Postgres via the [`postgres`](https://github.com/porsager/postgres) driver, so it works with **Neon** (what "Vercel Postgres" is now, via the Vercel Marketplace), **Supabase**, or any Postgres. The schema is in `db/schema.sql`: tables `events` and `client_info`.

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js).
2. Add a database: Vercel dashboard → Storage → Marketplace → Neon (free tier) → connect to the project. This sets `DATABASE_URL`. For Supabase, copy the **transaction pooler** connection string (port 6543) into `DATABASE_URL`.
3. Set the environment variables (Project → Settings → Environment Variables), see `.env.example`:
   - `TRACKING_SECRET`: `openssl rand -hex 32`. Changing it invalidates every link already sent.
   - `DASHBOARD_PASSWORD`
   - Optional: `ALLOWED_DEST_HOSTS`, `IP_MODE`, `GEO_FALLBACK`, `DETAILED_FINGERPRINT`, `PUBLIC_BASE_URL`.
   - `PUBLIC_BASE_URL` (e.g. `https://go.yourbusiness.com`): the base for links built in `/dashboard/links`. Without it the builder uses the host you opened the dashboard on. Vercel's team alias (`*-projects.vercel.app`), branch aliases (`*-git-*.vercel.app`) and deployment URLs sit behind Deployment Protection, so links built there send customers to a Vercel login page and log nothing; the builder warns when that happens. Set it to your production `.vercel.app` domain or a custom domain.
4. Create the tables once, from your machine: `DATABASE_URL=... npm run db:migrate` (or paste `db/schema.sql` into the Neon/Supabase SQL editor).
5. Deploy, then open `https://<your-app>.vercel.app/dashboard`. A custom domain (e.g. `go.yourbusiness.com`) improves deliverability and trust.

Local development: copy `.env.example` to `.env.local`, then run `npm install`, `npm run db:migrate` and `npm run dev`.

## Building links

**One recipient:** use `/dashboard/links`.

**A whole list:** use the CLI, which prints CSV you can merge into your mail tool:

```sh
TRACKING_SECRET=... npm run link -- https://go.yourbusiness.com spring-sale https://yourshop.com/sale < recipients.txt
# recipient,click_url,pixel_url
```

Use a stable, non-sensitive recipient ID (a customer number or a hash) rather than an email address, since the ID appears in the URL.

In the email HTML:

```html
<a href="CLICK_URL">Shop the sale</a>
<img src="PIXEL_URL" width="1" height="1" alt="" style="display:block;border:0" />
```

## Click page data

The click page collects these browser fields with JavaScript, in about 300 ms, before redirecting:

- **Always:** screen and available size, viewport, pixel ratio, colour depth, orientation, timezone and UTC offset, languages, platform, touch points, light/dark preference, connection type/downlink/RTT/save-data, cookies enabled, Do Not Track, Global Privacy Control.
- **`DETAILED_FINGERPRINT=on` (default):** CPU cores (`hardwareConcurrency`), device memory, GPU vendor/renderer (WebGL), battery level and charging state (Chromium only; most other browsers don't expose it). These are skipped for visitors whose browser sends Global Privacy Control.

> **Consent caveat for `DETAILED_FINGERPRINT`:** GPU, hardware and battery values are device-fingerprinting signals. Under the EU/UK GDPR and the ePrivacy Directive, reading them from a visitor's device generally needs prior consent, and Canada's PIPEDA and US state laws (e.g. CCPA/CPRA) require that it be disclosed and proportionate to a stated purpose. Unless your privacy policy covers this and you have the consent you need, set `DETAILED_FINGERPRINT=off`. The server then also drops these fields if a client sends them.

## Privacy and accuracy

- Your recipients should be covered by your privacy policy, which should mention email open/click tracking and what you collect. Honour unsubscribes and applicable law (CASL, CAN-SPAM, GDPR).
- Data stays in your own database. Nothing is sold or shared with third parties. The only outbound call is the optional geo fallback (`GEO_FALLBACK=ipwhois` sends the IP to [ipwho.is](https://ipwho.is)). Set it to `none` to rely on Vercel headers only. On Vercel the headers are almost always present, so the fallback mainly matters elsewhere.
- `IP_MODE=truncate` stores only a /24 (IPv4) or /48 (IPv6), and `none` stores no IP.
- **Open rates are approximate.** Many clients block images by default. Apple Mail Privacy Protection preloads pixels through Apple proxies, which inflates opens and hides location. Gmail serves images through `GoogleImageProxy`, which shows as "Mail image proxy", with Google's location rather than the reader's.
- **Clicks can include security scanners** (Proofpoint, Mimecast, Barracuda, etc.) that follow links before the person does. Known bots are flagged and hidden by default. Use "Show bots/scanners" to see them. Location is IP-based, so it's approximate (city level at best, and VPNs/corporate networks skew it).
- To delete someone's data: `DELETE FROM client_info WHERE click_id IN (SELECT click_id FROM events WHERE recipient = '...'); DELETE FROM events WHERE recipient = '...';`

## Development

```sh
npm test       # unit tests (signing, validation, UA parsing, sanitiser, HTML escaping)
npm run lint   # type check
npm run build
```
