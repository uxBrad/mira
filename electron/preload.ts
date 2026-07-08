import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Electron prefixes rejected ipcMain.handle errors with "Error invoking remote
// method '<channel>': Error: <message>" — strip that so the renderer sees the
// original message the handler threw.
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  try {
    return await ipcRenderer.invoke(channel, ...args)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const cleaned = message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')
    throw new Error(cleaned || message)
  }
}

// Auth API
const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    invoke('auth:register', data),
  login: (data: { email: string; password: string }) =>
    invoke('auth:login', data),
  logout: () => invoke('auth:logout'),
  getSession: () => invoke('auth:getSession'),
  getRememberedCredentials: () => invoke('auth:getRememberedCredentials'),
  saveRememberedCredentials: (data: { email: string; password: string } | null) =>
    invoke('auth:saveRememberedCredentials', data),
  forgotPassword: (email: string) => invoke('auth:forgotPassword', email),
  verifyEmail: (email: string, code: string) =>
    invoke('auth:verifyEmail', { email, code }),
  resendVerification: (email: string) =>
    invoke('auth:resendVerification', email),
  resetPassword: (data: { email: string; code: string; password: string }) =>
    invoke('auth:resetPassword', data),
  getSubscriptionStatus: () => invoke('auth:getSubscriptionStatus'),
  createCheckout: (plan: 'monthly' | 'yearly') =>
    invoke('auth:createCheckout', plan),
  openBillingPortal: () => invoke('auth:openBillingPortal'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    invoke('auth:changePassword', data)
}

// Projects API
const projectsAPI = {
  list: () => invoke('projects:list'),
  get: (id: string) => invoke('projects:get', id),
  create: (data: {
    name: string
    clientName?: string
    url?: string
    description?: string
    standards?: string
    auditUrls?: string[]
    components?: string[]
    clientLogoPath?: string
  }) => invoke('projects:create', data),
  update: (
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
      clientLogoPath?: string | null
    }
  ) => invoke('projects:update', id, data),
  delete: (id: string) => invoke('projects:delete', id)
}

// Findings API
const findingsAPI = {
  list: (projectId: string) => invoke('findings:list', projectId),
  get: (id: string) => invoke('findings:get', id),
  create: (data: {
    projectId: string
    title: string
    description?: string
    wcagCriterion?: string
    wcagLevel?: string
    standards?: string[]
    category?: string
    status?: string
    pageUrl?: string
    component?: string
    screenshotPath?: string
    recommendations?: string
    notes?: string
  }) => invoke('findings:create', data),
  update: (id: string, data: Record<string, unknown>) =>
    invoke('findings:update', id, data),
  delete: (id: string) => invoke('findings:delete', id),
  addScreenshot: (findingId: string, sourcePath: string) =>
    invoke('findings:addScreenshot', findingId, sourcePath)
}

// Templates API
const templatesAPI = {
  list: () => invoke('templates:list'),
  create: (data: {
    title: string
    description?: string
    wcagCriterion?: string
    wcagLevel?: string
    standards?: string[]
    category?: string
    recommendations?: string
    notes?: string
  }) => invoke('templates:create', data),
  update: (id: string, data: Record<string, unknown>) =>
    invoke('templates:update', id, data),
  delete: (id: string) => invoke('templates:delete', id)
}

// Import API
const importAPI = {
  chooseFile: () => invoke('import:chooseFile'),
  parseFile: (filePath: string) => invoke('import:parseFile', filePath),
  importFindings: (projectId: string, findings: unknown[]) =>
    invoke('import:importFindings', projectId, findings)
}

// Update API
const updateAPI = {
  onAvailable: (cb: () => void) => ipcRenderer.on('update:available', cb),
  onReady: (cb: () => void) => ipcRenderer.on('update:ready', cb),
  install: () => invoke('update:install')
}

// Export API
const exportAPI = {
  pdf: (projectId: string, format?: 'summary' | 'vpat', auditState?: { criteriaVerdict: Record<string, 'pass' | 'fail'>; criteriaProgress: Partial<Record<string, 'complete'>> }) =>
    invoke('export:pdf', projectId, format || 'summary', auditState),
  csv: (projectId: string) => invoke('export:csv', projectId),
  chooseScreenshot: () => invoke('export:chooseScreenshot')
}

// System API
const systemAPI = {
  openFile: (filePath: string) => invoke('system:openFile', filePath),
  quit: () => invoke('system:quit'),
  saveClipboardImage: (base64: string) => invoke('system:saveClipboardImage', base64),
  readClipboardImage: () => invoke('system:readClipboardImage'),
  readFileAsBase64: (filePath: string) => invoke('system:readFileAsBase64', filePath)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      auth: authAPI,
      projects: projectsAPI,
      findings: findingsAPI,
      templates: templatesAPI,
      export: exportAPI,
      update: updateAPI,
      import: importAPI,
      system: systemAPI
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = {
    auth: authAPI,
    projects: projectsAPI,
    findings: findingsAPI,
    templates: templatesAPI,
    export: exportAPI,
    update: updateAPI,
    import: importAPI,
    system: systemAPI
  }
}
