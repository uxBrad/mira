import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Auth API
const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    ipcRenderer.invoke('auth:register', data),
  login: (data: { email: string; password: string }) =>
    ipcRenderer.invoke('auth:login', data),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  forgotPassword: (email: string) => ipcRenderer.invoke('auth:forgotPassword', email),
  verifyEmail: (email: string, code: string) =>
    ipcRenderer.invoke('auth:verifyEmail', { email, code }),
  resetPassword: (data: { email: string; code: string; password: string }) =>
    ipcRenderer.invoke('auth:resetPassword', data),
  getSubscriptionStatus: () => ipcRenderer.invoke('auth:getSubscriptionStatus'),
  createCheckout: (plan: 'monthly' | 'yearly') =>
    ipcRenderer.invoke('auth:createCheckout', plan),
  openBillingPortal: () => ipcRenderer.invoke('auth:openBillingPortal'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    ipcRenderer.invoke('auth:changePassword', data)
}

// Projects API
const projectsAPI = {
  list: () => ipcRenderer.invoke('projects:list'),
  get: (id: string) => ipcRenderer.invoke('projects:get', id),
  create: (data: {
    name: string
    clientName?: string
    url?: string
    description?: string
  }) => ipcRenderer.invoke('projects:create', data),
  update: (
    id: string,
    data: { name?: string; clientName?: string; url?: string; description?: string; status?: string }
  ) => ipcRenderer.invoke('projects:update', id, data),
  delete: (id: string) => ipcRenderer.invoke('projects:delete', id)
}

// Findings API
const findingsAPI = {
  list: (projectId: string) => ipcRenderer.invoke('findings:list', projectId),
  get: (id: string) => ipcRenderer.invoke('findings:get', id),
  create: (data: {
    projectId: string
    title: string
    description?: string
    wcagCriterion?: string
    wcagLevel?: string
    standards?: string[]
    category?: string
    severity?: string
    status?: string
    pageUrl?: string
    screenshotPath?: string
    recommendations?: string
    notes?: string
  }) => ipcRenderer.invoke('findings:create', data),
  update: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('findings:update', id, data),
  delete: (id: string) => ipcRenderer.invoke('findings:delete', id),
  addScreenshot: (findingId: string, sourcePath: string) =>
    ipcRenderer.invoke('findings:addScreenshot', findingId, sourcePath)
}

// Update API
const updateAPI = {
  onAvailable: (cb: () => void) => ipcRenderer.on('update:available', cb),
  onReady: (cb: () => void) => ipcRenderer.on('update:ready', cb),
  install: () => ipcRenderer.invoke('update:install')
}

// Export API
const exportAPI = {
  exportPDF: (projectId: string) => ipcRenderer.invoke('export:pdf', projectId),
  exportCSV: (projectId: string) => ipcRenderer.invoke('export:csv', projectId),
  chooseScreenshot: () => ipcRenderer.invoke('export:chooseScreenshot')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      auth: authAPI,
      projects: projectsAPI,
      findings: findingsAPI,
      export: exportAPI,
      update: updateAPI
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = { auth: authAPI, projects: projectsAPI, findings: findingsAPI, export: exportAPI, update: updateAPI }
}
