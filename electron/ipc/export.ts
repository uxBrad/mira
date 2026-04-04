import { IpcMain, BrowserWindow, dialog } from 'electron'
import { getDb } from '../../db'
import { projects, findings } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { writeFileSync } from 'fs'

type _GetMainWindow = () => BrowserWindow | null

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerExportHandlers(ipcMain: IpcMain, _getMainWindow: _GetMainWindow): void {
  ipcMain.handle('export:chooseScreenshot', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Screenshot',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('export:csv', async (_, projectId: string) => {
    const db = getDb()
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) throw new Error('Project not found')

    const findingRows = await db
      .select()
      .from(findings)
      .where(eq(findings.projectId, projectId))
      .orderBy(desc(findings.createdAt))

    const headers = [
      'ID',
      'Title',
      'WCAG Criterion',
      'WCAG Level',
      'Standards',
      'Category',
      'Severity',
      'Status',
      'Page URL',
      'Description',
      'Recommendations',
      'Notes'
    ]

    const rows = findingRows.map((f) => [
      escapeCsvField(f.id),
      escapeCsvField(f.title),
      escapeCsvField(f.wcagCriterion),
      escapeCsvField(f.wcagLevel),
      escapeCsvField(
        f.standards
          ? JSON.parse(f.standards as string)
              .join('; ')
          : ''
      ),
      escapeCsvField(f.category),
      escapeCsvField(f.severity),
      escapeCsvField(f.status),
      escapeCsvField(f.pageUrl),
      escapeCsvField(f.description),
      escapeCsvField(f.recommendations),
      escapeCsvField(f.notes)
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Findings as CSV',
      defaultPath: `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-findings.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })

    if (canceled || !filePath) return { canceled: true }

    writeFileSync(filePath, csv, 'utf-8')
    return { success: true, path: filePath }
  })

  ipcMain.handle('export:pdf', async (_, projectId: string) => {
    const db = getDb()
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project) throw new Error('Project not found')

    const findingRows = await db
      .select()
      .from(findings)
      .where(eq(findings.projectId, projectId))
      .orderBy(desc(findings.createdAt))

    // Build findings data for the PDF template
    const findingsData = findingRows.map((f) => ({
      ...f,
      standards: f.standards ? JSON.parse(f.standards as string) : []
    }))

    // Calculate severity counts for summary
    const severityCounts = {
      critical: findingsData.filter((f) => f.severity === 'critical').length,
      serious: findingsData.filter((f) => f.severity === 'serious').length,
      moderate: findingsData.filter((f) => f.severity === 'moderate').length,
      minor: findingsData.filter((f) => f.severity === 'minor').length
    }

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Report as PDF',
      defaultPath: `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-accessibility-report.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return { canceled: true }

    // Create a hidden window to render the PDF
    const pdfWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Build HTML report
    const html = buildReportHtml(project, findingsData, severityCounts)

    // Load HTML content
    await pdfWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    )

    // Wait for load
    await new Promise<void>((resolve) => {
      pdfWindow.webContents.once('did-finish-load', () => resolve())
    })

    // Small delay to ensure charts render
    await new Promise((resolve) => setTimeout(resolve, 500))

    const pdfData = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' }
    })

    pdfWindow.close()
    writeFileSync(filePath, pdfData)

    return { success: true, path: filePath }
  })
}

function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    serious: '#ea580c',
    moderate: '#d97706',
    minor: '#65a30d'
  }
  return colors[severity] || '#6b7280'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    wont_fix: "Won't Fix"
  }
  return labels[status] || status
}

function buildReportHtml(
  project: typeof projects.$inferSelect,
  findingsData: Array<typeof findings.$inferSelect & { standards: string[] }>,
  severityCounts: { critical: number; serious: number; moderate: number; minor: number }
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const totalFindings = findingsData.length
  const openFindings = findingsData.filter((f) => f.status === 'open' || f.status === 'in_progress').length

  const findingsHtml = findingsData
    .map(
      (f, i) => `
    <div class="finding" style="page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div class="finding-header" style="background: #f9fafb; padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 12px; color: #6b7280; font-weight: 500;">#${i + 1}</span>
            <span style="background: ${severityColor(f.severity || 'moderate')}22; color: ${severityColor(f.severity || 'moderate')}; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">${f.severity || 'moderate'}</span>
            ${f.wcagLevel ? `<span style="background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 9999px;">WCAG ${f.wcagLevel}</span>` : ''}
            <span style="margin-left: auto; font-size: 12px; color: #6b7280;">${statusLabel(f.status || 'open')}</span>
          </div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${escapeHtml(f.title)}</h3>
          ${f.wcagCriterion ? `<p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">WCAG ${f.wcagCriterion}${f.pageUrl ? ` · ${escapeHtml(f.pageUrl)}` : ''}</p>` : ''}
        </div>
      </div>
      <div style="padding: 16px;">
        ${f.description ? `<div style="margin-bottom: 12px;"><p style="font-weight: 600; font-size: 13px; color: #374151; margin: 0 0 4px;">Issue</p><p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${escapeHtml(f.description)}</p></div>` : ''}
        ${f.recommendations ? `<div style="margin-bottom: 12px;"><p style="font-weight: 600; font-size: 13px; color: #374151; margin: 0 0 4px;">Recommendation</p><p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${escapeHtml(f.recommendations)}</p></div>` : ''}
        ${f.notes ? `<div><p style="font-weight: 600; font-size: 13px; color: #374151; margin: 0 0 4px;">Notes</p><p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${escapeHtml(f.notes)}</p></div>` : ''}
        ${
          f.standards && f.standards.length > 0
            ? `<div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">${f.standards.map((s) => `<span style="background: #f3f4f6; color: #374151; font-size: 11px; padding: 2px 8px; border-radius: 4px;">${s}</span>`).join('')}</div>`
            : ''
        }
      </div>
    </div>
  `
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Accessibility Audit Report — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #111827; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px; }
  @media print { .page { padding: 0; } }
</style>
</head>
<body>
<!-- Cover Page -->
<div class="page" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; border-bottom: 4px solid #2563eb;">
  <div style="margin-bottom: 48px;">
    <div style="width: 48px; height: 48px; background: #2563eb; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 800; font-size: 20px;">G</span>
    </div>
    <p style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px;">Accessibility Audit Report</p>
    <h1 style="font-size: 40px; font-weight: 800; margin: 0 0 12px; line-height: 1.2; color: #111827;">${escapeHtml(project.name)}</h1>
    ${project.clientName ? `<p style="font-size: 18px; color: #6b7280; margin: 0 0 8px;">Prepared for: <strong>${escapeHtml(project.clientName)}</strong></p>` : ''}
    ${project.url ? `<p style="font-size: 14px; color: #9ca3af; margin: 0;">${escapeHtml(project.url)}</p>` : ''}
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 48px;">
    ${[
      { label: 'Total Issues', value: totalFindings, color: '#2563eb' },
      { label: 'Critical', value: severityCounts.critical, color: '#dc2626' },
      { label: 'Serious', value: severityCounts.serious, color: '#ea580c' },
      { label: 'Open', value: openFindings, color: '#d97706' }
    ]
      .map(
        (stat) => `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="font-size: 32px; font-weight: 800; color: ${stat.color}; margin: 0;">${stat.value}</p>
        <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0; font-weight: 500;">${stat.label}</p>
      </div>
    `
      )
      .join('')}
  </div>
  <p style="font-size: 14px; color: #9ca3af; margin: 0;">Generated ${date} · Grounds for Access</p>
</div>

<!-- Executive Summary -->
<div class="page" style="padding-top: 32px;">
  <h2 style="font-size: 24px; font-weight: 700; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px;">Executive Summary</h2>
  <p style="font-size: 15px; color: #4b5563; line-height: 1.7; margin-bottom: 24px;">
    This accessibility audit of <strong>${escapeHtml(project.name)}</strong> identified <strong>${totalFindings} issue${totalFindings !== 1 ? 's' : ''}</strong> across the evaluated scope.
    ${severityCounts.critical > 0 ? `<strong style="color: #dc2626">${severityCounts.critical} critical issue${severityCounts.critical !== 1 ? 's' : ''}</strong> require immediate attention. ` : ''}
    ${totalFindings === 0 ? 'No accessibility issues were found during this audit.' : `A total of ${openFindings} issue${openFindings !== 1 ? 's' : ''} remain${openFindings === 1 ? 's' : ''} open.`}
  </p>

  <!-- Severity breakdown -->
  <div style="margin-bottom: 32px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Issues by Severity</h3>
    ${[
      { label: 'Critical', count: severityCounts.critical, color: '#dc2626' },
      { label: 'Serious', count: severityCounts.serious, color: '#ea580c' },
      { label: 'Moderate', count: severityCounts.moderate, color: '#d97706' },
      { label: 'Minor', count: severityCounts.minor, color: '#65a30d' }
    ]
      .map(
        (s) => `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <span style="min-width: 80px; font-size: 13px; font-weight: 500; color: #374151;">${s.label}</span>
        <div style="flex: 1; background: #f3f4f6; border-radius: 4px; height: 20px; overflow: hidden;">
          <div style="width: ${totalFindings > 0 ? Math.round((s.count / totalFindings) * 100) : 0}%; background: ${s.color}; height: 100%; border-radius: 4px;"></div>
        </div>
        <span style="min-width: 28px; text-align: right; font-size: 14px; font-weight: 700; color: ${s.color};">${s.count}</span>
      </div>
    `
      )
      .join('')}
  </div>

  <!-- Project details -->
  ${
    project.description
      ? `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="font-weight: 600; font-size: 13px; color: #374151; margin: 0 0 8px;">Audit Scope</p>
      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${escapeHtml(project.description)}</p>
    </div>`
      : ''
  }
</div>

<!-- Detailed Findings -->
<div class="page" style="padding-top: 16px;">
  <h2 style="font-size: 24px; font-weight: 700; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px;">Detailed Findings</h2>
  ${findingsHtml || '<p style="color: #6b7280; font-style: italic;">No findings recorded for this project.</p>'}
</div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
