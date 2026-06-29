import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  clientName: text('client_name'),
  url: text('url'),
  description: text('description'),
  status: text('status').notNull().default('in_progress'),
  standards: text('standards'),
  auditUrls: text('audit_urls'),         // JSON array of path strings e.g. ["/home", "/checkout"]
  components: text('components'),        // JSON array of component names e.g. ["Navigation", "Header"]
  clientLogoPath: text('client_logo_path'),
  auditorName: text('auditor_name'),
  auditorCredentials: text('auditor_credentials'),
  testingEnvironment: text('testing_environment'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const findings = sqliteTable('findings', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  wcagCriterion: text('wcag_criterion'),
  wcagLevel: text('wcag_level'),
  standards: text('standards'), // JSON array string
  category: text('category'),
  severity: text('severity').default('moderate'),
  status: text('status').default('open'),
  pageUrl: text('page_url'), // audit page path e.g. "/home"
  component: text('component'), // component name e.g. "Navigation"
  screenshotPath: text('screenshot_path'),
  recommendations: text('recommendations'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const findingTemplates = sqliteTable('finding_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  wcagCriterion: text('wcag_criterion'),
  wcagLevel: text('wcag_level'),
  standards: text('standards'), // JSON array string
  category: text('category'),
  severity: text('severity').default('moderate'),
  recommendations: text('recommendations'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Finding = typeof findings.$inferSelect
export type NewFinding = typeof findings.$inferInsert
export type FindingTemplate = typeof findingTemplates.$inferSelect
export type NewFindingTemplate = typeof findingTemplates.$inferInsert
