import { IpcMain, app } from 'electron'
import { shell } from 'electron'
import fs from 'fs'
import path from 'path'

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
}
