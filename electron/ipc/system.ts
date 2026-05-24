import { IpcMain, app, clipboard } from 'electron'
import { shell } from 'electron'
import fs from 'fs'
import path from 'path'

function fileToDataUrl(filePath: string): string | null {
  try {
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch { return null }
}

type _GetMainWindow = () => any // eslint-disable-line @typescript-eslint/no-explicit-any

export function registerSystemHandlers(ipcMain: IpcMain, _getMainWindow: _GetMainWindow): void {
  ipcMain.handle('system:openFile', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open file'
      console.error('[System] Error opening file:', message)
      throw error
    }
  })

  ipcMain.handle('system:quit', () => {
    app.quit()
  })

  ipcMain.handle('system:saveClipboardImage', async (_, base64: string) => {
    const tempDir = app.getPath('temp')
    const fileName = `echo-screenshot-${Date.now()}.png`
    const filePath = path.join(tempDir, fileName)
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return filePath
  })

  ipcMain.handle('system:readClipboardImage', async () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    const pngBuffer = image.toPNG()
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  })

  ipcMain.handle('system:readFileAsBase64', async (_, filePath: string) => {
    return fileToDataUrl(filePath)
  })
}
