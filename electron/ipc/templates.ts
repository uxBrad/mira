import { IpcMain } from 'electron'
import { getDb } from '../../db'
import { findingTemplates } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export function registerTemplateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('templates:list', async () => {
    const db = getDb()
    const rows = await db.select().from(findingTemplates).orderBy(desc(findingTemplates.updatedAt))
    return rows.map((t) => ({
      ...t,
      standards: t.standards ? JSON.parse(t.standards) : []
    }))
  })

  ipcMain.handle(
    'templates:create',
    async (
      _,
      data: {
        title: string
        description?: string
        wcagCriterion?: string
        wcagLevel?: string
        standards?: string[]
        category?: string
        recommendations?: string
        notes?: string
      }
    ) => {
      const db = getDb()
      const now = Date.now()
      const id = randomUUID()

      await db.insert(findingTemplates).values({
        id,
        title: data.title,
        description: data.description || null,
        wcagCriterion: data.wcagCriterion || null,
        wcagLevel: data.wcagLevel || null,
        standards: data.standards && data.standards.length > 0 ? JSON.stringify(data.standards) : null,
        category: data.category || null,
        recommendations: data.recommendations || null,
        notes: data.notes || null,
        createdAt: now,
        updatedAt: now
      })

      const [template] = await db.select().from(findingTemplates).where(eq(findingTemplates.id, id))
      return {
        ...template,
        standards: template.standards ? JSON.parse(template.standards) : []
      }
    }
  )

  ipcMain.handle(
    'templates:update',
    async (_, id: string, data: Record<string, unknown>) => {
      const db = getDb()
      const updateData: Record<string, unknown> = { ...data, updatedAt: Date.now() }

      if (Array.isArray(updateData['standards'])) {
        updateData['standards'] = updateData['standards'].length > 0
          ? JSON.stringify(updateData['standards'])
          : null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.update(findingTemplates).set(updateData as any).where(eq(findingTemplates.id, id))
      const [template] = await db.select().from(findingTemplates).where(eq(findingTemplates.id, id))
      return {
        ...template,
        standards: template.standards ? JSON.parse(template.standards) : []
      }
    }
  )

  ipcMain.handle('templates:delete', async (_, id: string) => {
    const db = getDb()
    await db.delete(findingTemplates).where(eq(findingTemplates.id, id))
    return { success: true }
  })
}
