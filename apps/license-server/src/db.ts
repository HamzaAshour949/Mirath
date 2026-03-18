import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env['DATABASE_PATH'] ?? path.join(process.cwd(), 'data', 'mirath.db')

export const db = new Database(DB_PATH)

// Run migrations on startup
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL,
      fingerprint_hash TEXT NOT NULL,
      issued_at       INTEGER NOT NULL,
      revoked_at      INTEGER,
      purchase_ref    TEXT NOT NULL,
      purchase_method TEXT NOT NULL CHECK(purchase_method IN ('stripe', 'x402'))
    );

    CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
  `)
}
