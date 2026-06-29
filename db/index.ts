import { app } from 'electron'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient, Client } from '@libsql/client'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as schema from './schema'

let db: LibSQLDatabase<typeof schema> | null = null

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'grounds-for-access.db')

  const client = createClient({
    url: `file:${dbPath}`
  })

  db = drizzle(client, { schema })

  await runMigrations(client)
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

async function runMigrations(client: Client): Promise<void> {
  // Core table creation (idempotent)
  const statements = [
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT,
      url TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS findings (
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
    )`,
    `CREATE TABLE IF NOT EXISTS finding_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      wcag_criterion TEXT,
      wcag_level TEXT,
      standards TEXT,
      category TEXT,
      severity TEXT DEFAULT 'moderate',
      recommendations TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_findings_project_id ON findings(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at)`
  ]

  for (const sql of statements) {
    await client.execute(sql)
  }

  // Additive migrations — columns that may not exist on older DBs
  const alterStatements = [
    `ALTER TABLE projects ADD COLUMN standards TEXT`,
    `ALTER TABLE projects ADD COLUMN audit_urls TEXT`,
    `ALTER TABLE projects ADD COLUMN components TEXT`,
    `ALTER TABLE projects ADD COLUMN client_logo_path TEXT`,
    `ALTER TABLE projects ADD COLUMN auditor_name TEXT`,
    `ALTER TABLE projects ADD COLUMN auditor_credentials TEXT`,
    `ALTER TABLE projects ADD COLUMN testing_environment TEXT`,
    `ALTER TABLE findings ADD COLUMN component TEXT`
  ]

  for (const sql of alterStatements) {
    try {
      await client.execute(sql)
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
