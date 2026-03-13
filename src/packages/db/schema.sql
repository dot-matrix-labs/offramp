-- SQLite Schema Definition
-- Strict blueprint compliance: No ORMs allowed.

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    synopsis TEXT DEFAULT '',
    articles TEXT DEFAULT '[]', -- JSON stringified array of Article objects
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for quickly fetching a user's drafts
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
