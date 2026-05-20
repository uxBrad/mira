import { IpcMain, app } from 'electron'
import { shell } from 'electron'

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
}
