CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  type        TEXT NOT NULL CHECK (type IN ('click', 'open')),
  campaign    TEXT NOT NULL,
  recipient   TEXT NOT NULL,
  destination TEXT,
  ip          TEXT,
  country     TEXT,
  region      TEXT,
  city        TEXT,
  user_agent  TEXT,
  device      TEXT,
  os          TEXT,
  browser     TEXT,
  is_bot      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_campaign_idx ON events (campaign, created_at DESC);

ALTER TABLE events ADD COLUMN IF NOT EXISTS click_id UUID UNIQUE;

-- Browser-side details posted by the click interstitial, keyed by the click's id.
CREATE TABLE IF NOT EXISTS client_info (
  click_id   UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data       JSONB NOT NULL
);
