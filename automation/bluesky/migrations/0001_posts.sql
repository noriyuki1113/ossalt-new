-- Apply once with: npx wrangler d1 migrations apply ossalt-bluesky-queue --remote --config automation/bluesky/wrangler.jsonc
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_jst TEXT NOT NULL UNIQUE CHECK (length(day_jst) = 10),
  scheduled_at TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0),
  state TEXT NOT NULL DEFAULT 'approved' CHECK (state IN ('approved','publishing','published','needs_review')),
  rkey TEXT NOT NULL UNIQUE,
  uri TEXT,
  cid TEXT,
  public_url TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_due ON posts(state, scheduled_at);
