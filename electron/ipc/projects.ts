import { IpcMain } from 'electron'
import { getDb } from '../../db'
import { projects, findings } from '../../db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

function deserializeProject(project: typeof projects.$inferSelect & { findingCount?: number }) {
  return {
    ...project,
    auditUrls: project.auditUrls ? JSON.parse(project.auditUrls) : [],
    components: project.components ? JSON.parse(project.components) : []
  }
}

export function registerProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('projects:list', async () => {
    const db = getDb()
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        clientName: projects.clientName,
        url: projects.url,
        description: projects.description,
        status: projects.status,
        standards: projects.standards,
        auditUrls: projects.auditUrls,
        components: projects.components,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        findingCount: sql<number>`(SELECT COUNT(*) FROM findings WHERE findings.project_id = ${projects.id})`
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt))

    return rows.map(deserializeProject)
  })

  ipcMain.handle('projects:get', async (_, id: string) => {
    const db = getDb()
    const [project] = await db.select().from(projects).where(eq(projects.id, id))
    if (!project) throw new Error('Project not found')
    return deserializeProject(project)
  })

  ipcMain.handle(
    'projects:create',
    async (
      _,
      data: {
        name: string
        clientName?: string
        url?: string
        description?: string
        standards?: string
        auditUrls?: string[]
        components?: string[]
      }
    ) => {
      const db = getDb()
      const now = Date.now()
      const id = randomUUID()

      await db.insert(projects).values({
        id,
        name: data.name,
        clientName: data.clientName || null,
        url: data.url || null,
        description: data.description || null,
        status: 'in_progress',
        standards: data.standards || null,
        auditUrls: data.auditUrls?.length ? JSON.stringify(data.auditUrls) : null,
        components: data.components?.length ? JSON.stringify(data.components) : null,
        createdAt: now,
        updatedAt: now
      })

      const [project] = await db.select().from(projects).where(eq(projects.id, id))
      return deserializeProject(project)
    }
  )

  ipcMain.handle(
    'projects:update',
    async (
      _,
      id: string,
      data: {
        name?: string
        clientName?: string
        url?: string
        description?: string
        status?: string
        standards?: string
        auditUrls?: string[]
        components?: string[]
      }
    ) => {
      const db = getDb()
      const { auditUrls, components, ...rest } = data
      const updateData: Record<string, unknown> = { ...rest, updatedAt: Date.now() }

      if (Array.isArray(auditUrls)) {
        updateData['auditUrls'] = auditUrls.length ? JSON.stringify(auditUrls) : null
      }
      if (Array.isArray(components)) {
        updateData['components'] = components.length ? JSON.stringify(components) : null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.update(projects).set(updateData as any).where(eq(projects.id, id))

      const [project] = await db.select().from(projects).where(eq(projects.id, id))
      return deserializeProject(project)
    }
  )

  ipcMain.handle('projects:delete', async (_, id: string) => {
    const db = getDb()
    await db.delete(findings).where(eq(findings.projectId, id))
    await db.delete(projects).where(eq(projects.id, id))
    return { success: true }
  })
}
