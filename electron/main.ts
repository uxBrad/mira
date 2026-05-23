import { app, shell, BrowserWindow, ipcMain, globalShortcut, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { registerAuthHandlers } from './ipc/auth'
import { registerProjectHandlers } from './ipc/projects'
import { registerFindingHandlers } from './ipc/findings'
import { registerExportHandlers } from './ipc/export'
import { registerTemplateHandlers } from './ipc/templates'
import { registerImportHandlers } from './ipc/import'
import { registerSystemHandlers } from './ipc/system'
import { initDatabase } from '../db'

let mainWindow: BrowserWindow | null = null

function setupAutoUpdater(): void {
  // Don't check for updates in development
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update:available')
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:ready')
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates ~5 seconds after window is shown
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Update check failed:', err)
    })
  }, 5000)
}

function getAppIcon(): Electron.NativeImage | undefined {
  // Check resources/ directory (relative to project root from out/main/)
  const candidates = [
    join(__dirname, '../../resources/icon.png'),
    join(__dirname, '../../../resources/icon.png'),
    join(app.getAppPath(), 'resources/icon.png'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return nativeImage.createFromPath(p)
  }
  return undefined
}

function createWindow(): void {
  const icon = getAppIcon()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform !== 'darwin' && {
      titleBarOverlay: {
        color: '#ffffff',
        symbolColor: '#1a1a1a',
        height: 48
      }
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    // if (is.dev) mainWindow!.webContents.openDevTools()

    // Dev-only: F12 / Ctrl+Shift+I toggles DevTools
    if (is.dev) {
      const toggleDevTools = () => mainWindow?.webContents.toggleDevTools()
      globalShortcut.register('F12', toggleDevTools)
      globalShortcut.register('CmdOrCtrl+Shift+I', toggleDevTools)
    }

    setupAutoUpdater()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev) {
    mainWindow.loadURL('http://localhost:5173/')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.helloecho.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize local database
  await initDatabase()

  // Register IPC handlers
  registerAuthHandlers(ipcMain)
  registerProjectHandlers(ipcMain)
  registerFindingHandlers(ipcMain)
  registerExportHandlers(ipcMain, () => mainWindow)
  registerTemplateHandlers(ipcMain)
  registerImportHandlers(ipcMain)
  registerSystemHandlers(ipcMain, () => mainWindow)

  // Auto-updater: quit and install
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
