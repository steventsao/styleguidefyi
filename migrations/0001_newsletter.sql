-- Launch signups are unverified. Never treat them as a confirmed mailing list.
CREATE TABLE IF NOT EXISTS newsletter_signups (
  email TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  unsubscribe_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  confirmed_at TEXT
);
