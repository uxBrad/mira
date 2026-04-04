import { app } from 'electron'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | null = null

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'grounds-for-access.db')
  const sqlite = new Database(dbPath)

  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  // Run migrations inline for simplicity
  runMigrations(sqlite)
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT,
      url TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT,
      wcag_criterion TEXT,
      wcag_level TEXT,
      standards TEXT,
      category TEXT,
      severity TEXT DEFAULT 'moderate',
      status TEXT DEFAULT 'open',
      page_url TEXT,
      screenshot_path TEXT,
      recommendations TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_findings_project_id ON findings(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
  `)
}
