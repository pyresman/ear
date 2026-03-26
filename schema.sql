CREATE TABLE IF NOT EXISTS messages (
    code TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    destroy_mode TEXT NOT NULL DEFAULT 'play',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    accessed INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_expires ON messages(expires_at);
