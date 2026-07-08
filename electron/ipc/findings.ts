import { IpcMain, app } from 'electron'
import { getDb } from '../../db'
import { findings } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'

function getScreenshotsDir(): string {
  const dir = join(app.getPath('userData'), 'screenshots')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function registerFindingHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('findings:list', async (_, projectId: string) => {
    const db = getDb()
    return db
      .select()
      .from(findings)
      .where(eq(findings.projectId, projectId))
      .orderBy(desc(findings.createdAt))
  })

  ipcMain.handle('findings:get', async (_, id: string) => {
    const db = getDb()
    const [finding] = await db.select().from(findings).where(eq(findings.id, id))
    if (!finding) throw new Error('Finding not found')
    return finding
  })

  ipcMain.handle('findings:create', async (_, data) => {
    const db = getDb()
    const now = Date.now()
    const id = randomUUID()

    await db.insert(findings).values({
      id,
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      wcagCriterion: data.wcagCriterion || null,
      wcagLevel: data.wcagLevel || null,
      standards: data.standards ? JSON.stringify(data.standards) : null,
      category: data.category || null,
      status: data.status || 'open',
      pageUrl: data.pageUrl || null,
      component: data.component || null,
      screenshotPath: data.screenshotPath || null,
      recommendations: data.recommendations || null,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now
    })

    const [finding] = await db.select().from(findings).where(eq(findings.id, id))
    return finding
  })

  ipcMain.handle('findings:update', async (_, id: string, data: Record<string, unknown>) => {
    const db = getDb()
    const updateData: Record<string, unknown> = { ...data, updatedAt: Date.now() }

    // Serialize arrays
    if (Array.isArray(updateData['standards'])) {
      updateData['standards'] = JSON.stringify(updateData['standards'])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(findings).set(updateData as any).where(eq(findings.id, id))
    const [finding] = await db.select().from(findings).where(eq(findings.id, id))
    return finding
  })

  ipcMain.handle('findings:delete', async (_, id: string) => {
    const db = getDb()
    await db.delete(findings).where(eq(findings.id, id))
    return { success: true }
  })

  ipcMain.handle('findings:addScreenshot', async (_, findingId: string, sourcePath: string) => {
    const screenshotsDir = getScreenshotsDir()
    const ext = extname(sourcePath) || '.png'
    const filename = `${findingId}${ext}`
    const destPath = join(screenshotsDir, filename)

    copyFileSync(sourcePath, destPath)

    const db = getDb()
    await db
      .update(findings)
      .set({ screenshotPath: destPath, updatedAt: Date.now() })
      .where(eq(findings.id, findingId))

    return { path: destPath }
  })
}
