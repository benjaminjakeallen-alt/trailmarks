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
      state_code TEXT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      lat REAL,
      lng REAL,
      title TEXT NOT NULL,
      body TEXT,
      memory_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_code TEXT,
      memory_id INTEGER REFERENCES memories(id) ON DELETE SET NULL,
      file_name TEXT NOT NULL,
      caption TEXT,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      started_at TEXT,
      ended_at TEXT,
      cover_photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memories_state ON memories(state_code);
    CREATE INDEX IF NOT EXISTS idx_memories_trip ON memories(trip_id);
    CREATE INDEX IF NOT EXISTS idx_photos_state ON photos(state_code);
    CREATE INDEX IF NOT EXISTS idx_photos_memory ON photos(memory_id);
    CREATE INDEX IF NOT EXISTS idx_trip_points_trip ON trip_points(trip_id, recorded_at);
  `);

  return db;
}
