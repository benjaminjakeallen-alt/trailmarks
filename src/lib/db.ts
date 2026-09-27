import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let db: DatabaseSync | null = null;

export function getDbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), "data", "trailmarks.db");
}

export function getPhotosDir(): string {
  return process.env.PHOTOS_DIR || path.join(process.cwd(), "data", "photos");
}

export function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(getPhotosDir(), { recursive: true });

  db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS state_visits (
      state_code TEXT PRIMARY KEY,
      visited INTEGER NOT NULL DEFAULT 0,
      first_visited_on TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_code TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      memory_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_code TEXT NOT NULL,
      memory_id INTEGER REFERENCES memories(id) ON DELETE SET NULL,
      file_name TEXT NOT NULL,
      caption TEXT,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_memories_state ON memories(state_code);
    CREATE INDEX IF NOT EXISTS idx_photos_state ON photos(state_code);
    CREATE INDEX IF NOT EXISTS idx_photos_memory ON photos(memory_id);
  `);

  return db;
}
