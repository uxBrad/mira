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

  ipcMain.handle('export:pdf', async (_, projectId: string, format: 'summary' | 'vpat' = 'summary') => {
    try {
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

      console.log('[PDF Export] Starting export to:', filePath)

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

      // Build HTML report based on format
      const html = format === 'vpat'
        ? buildVpatHtml(project, findingsData)
        : buildReportHtml(project, findingsData, severityCounts)
      console.log(`[PDF Export] ${format} HTML generated, length:`, html.length)

      // Load HTML content
      await pdfWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      )
      console.log('[PDF Export] HTML loaded into window')

      // Wait for load with timeout (data: URLs may not fire did-finish-load reliably)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[PDF Export] Load timeout, proceeding anyway')
          resolve()
        }, 2000)

        pdfWindow.webContents.once('did-finish-load', () => {
          clearTimeout(timeout)
          console.log('[PDF Export] Page finished loading')
          resolve()
        })
      })

      // Small delay to ensure content renders
      console.log('[PDF Export] Waiting for render...')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('[PDF Export] Generating PDF...')
      const pdfData = await pdfWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' }
      })

      console.log('[PDF Export] PDF generated, size:', pdfData.length, 'bytes')
      pdfWindow.close()
      writeFileSync(filePath, pdfData)
      console.log('[PDF Export] File written successfully')

      return { success: true, path: filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[PDF Export] Error:', message, error)
      throw error
    }
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

  const RED = '#c0392b'
  const BG = '#f5f0ef'

  const totalFindings = findingsData.length
  const openFindings = findingsData.filter((f) => f.status === 'open' || f.status === 'in_progress').length

  // Derive a human-readable audit type from the project standards field
  const auditTypeLabel = project.standards
    ? `${escapeHtml(project.standards)} Compliance Audit`
    : 'Accessibility Compliance Audit'

  function findingBadge(f: typeof findingsData[number]): string {
    const s = f.status || 'open'
    if (s === 'resolved') return `<span style="background:#16a34a;color:white;font-size:10px;font-weight:700;padding:3px 10px;letter-spacing:0.08em;text-transform:uppercase;"">PASS</span>`
    if (s === 'wont_fix') return `<span style="background:#6b7280;color:white;font-size:10px;font-weight:700;padding:3px 10px;letter-spacing:0.08em;text-transform:uppercase;">N/A</span>`
    return `<span style="background:${RED};color:white;font-size:10px;font-weight:700;padding:3px 10px;letter-spacing:0.08em;text-transform:uppercase;">FAIL</span>`
  }

  const findingsHtml = findingsData
    .map(
      (f) => `
    <div style="page-break-inside: avoid; margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #e0d9d7;">
      <!-- Criteria row -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888;">
          ${f.wcagCriterion ? `Criteria ${escapeHtml(f.wcagCriterion)}` : '&nbsp;'}
        </span>
        ${findingBadge(f)}
      </div>
      <!-- Finding title -->
      <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px;">${escapeHtml(f.title)}</h3>
      <!-- Meta row -->
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        ${f.severity ? `<span style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:600; color:${severityColor(f.severity)}; background:${severityColor(f.severity)}18; padding:2px 8px; text-transform:uppercase; letter-spacing:0.06em;">${escapeHtml(f.severity)}</span>` : ''}
        ${f.pageUrl ? `<span style="font-family:-apple-system,sans-serif; font-size:11px; color:#6b7280; padding:2px 8px; background:#f0ede9;">${escapeHtml(f.pageUrl)}</span>` : ''}
        ${f.component ? `<span style="font-family:-apple-system,sans-serif; font-size:11px; color:#6b7280; padding:2px 8px; background:#f0ede9;">${escapeHtml(f.component)}</span>` : ''}
      </div>
      ${f.description ? `<p style="font-family:-apple-system,sans-serif; margin:0 0 10px; font-size:14px; color:#444; line-height:1.65;">${escapeHtml(f.description)}</p>` : ''}
      ${f.recommendations ? `
        <div style="border-left: 3px solid ${RED}; padding-left: 12px; margin-top: 10px;">
          <p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:${RED}; margin:0 0 4px;">Recommendation</p>
          <p style="font-family:-apple-system,sans-serif; margin:0; font-size:13px; color:#333; line-height:1.6;">${escapeHtml(f.recommendations)}</p>
        </div>` : ''}
      ${f.notes ? `<p style="font-family:-apple-system,sans-serif; margin:10px 0 0; font-size:12px; color:#888; line-height:1.5;"><em>Note: ${escapeHtml(f.notes)}</em></p>` : ''}
    </div>
  `
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Accessibility Audit Report — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1a1a1a; }
  @page { margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- ══════════════════════════════════════
     COVER PAGE
══════════════════════════════════════ -->
<div style="min-height:100vh; background:${BG}; padding: 72px 80px; display:flex; flex-direction:column; justify-content:space-between;">

  <!-- Top: client + title -->
  <div>
    ${project.clientName ? `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:${RED}; margin-bottom:24px;">${escapeHtml(project.clientName)}</p>` : ''}

    <h1 style="font-family:Georgia,'Times New Roman',serif; font-size:52px; font-weight:700; line-height:1.15; color:#1a1a1a; margin-bottom:20px;">
      ${escapeHtml(auditTypeLabel)}
    </h1>

    <!-- Red decorative bar -->
    <div style="width:56px; height:5px; background:${RED}; margin-bottom:40px;"></div>

    ${project.name !== auditTypeLabel ? `<p style="font-family:-apple-system,sans-serif; font-size:16px; color:#555; margin-bottom:8px;">${escapeHtml(project.name)}</p>` : ''}
    ${project.url ? `<p style="font-family:-apple-system,sans-serif; font-size:13px; color:#888;">${escapeHtml(project.url)}</p>` : ''}
  </div>

  <!-- Stats row -->
  <div>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:40px;">
      ${[
        { label: 'Total Issues', value: totalFindings },
        { label: 'Critical', value: severityCounts.critical },
        { label: 'Serious', value: severityCounts.serious },
        { label: 'Open', value: openFindings }
      ].map((s) => `
        <div style="background:white; padding:20px 16px;">
          <p style="font-family:Georgia,serif; font-size:40px; font-weight:700; color:${RED}; line-height:1;">${s.value}</p>
          <p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#888; margin-top:6px;">${s.label}</p>
        </div>
      `).join('')}
    </div>
    <p style="font-family:-apple-system,sans-serif; font-size:12px; color:#aaa;">Generated ${date} · Echo</p>
  </div>
</div>

<!-- ══════════════════════════════════════
     SUMMARY PAGE
══════════════════════════════════════ -->
<div style="padding: 64px 80px; background:white; page-break-before:always;">
  ${project.clientName ? `<p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:${RED}; margin-bottom:16px;">${escapeHtml(project.clientName)}</p>` : ''}
  <h2 style="font-family:Georgia,serif; font-size:32px; font-weight:700; color:#1a1a1a; margin-bottom:12px;">Summary</h2>
  <div style="width:40px; height:4px; background:${RED}; margin-bottom:32px;"></div>

  <p style="font-family:-apple-system,sans-serif; font-size:15px; color:#444; line-height:1.7; margin-bottom:36px;">
    This accessibility audit of <strong>${escapeHtml(project.name)}</strong> identified
    <strong>${totalFindings} issue${totalFindings !== 1 ? 's' : ''}</strong> across the evaluated scope.
    ${severityCounts.critical > 0 ? `<strong style="color:${RED}">${severityCounts.critical} critical issue${severityCounts.critical !== 1 ? 's' : ''}</strong> require immediate attention. ` : ''}
    ${totalFindings === 0 ? 'No accessibility issues were found during this audit.' : `${openFindings} issue${openFindings !== 1 ? 's' : ''} remain${openFindings === 1 ? 's' : ''} open.`}
  </p>

  <!-- Severity bars -->
  <h3 style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#888; margin-bottom:20px;">Issues by Severity</h3>
  ${[
    { label: 'Critical', count: severityCounts.critical, color: '#c0392b' },
    { label: 'Serious', count: severityCounts.serious, color: '#e67e22' },
    { label: 'Moderate', count: severityCounts.moderate, color: '#d4ac0d' },
    { label: 'Minor', count: severityCounts.minor, color: '#27ae60' }
  ].map((s) => `
    <div style="display:flex; align-items:center; gap:14px; margin-bottom:10px;">
      <span style="font-family:-apple-system,sans-serif; font-size:12px; font-weight:600; color:#333; min-width:72px;">${s.label}</span>
      <div style="flex:1; background:#ede9e7; height:16px;">
        <div style="width:${totalFindings > 0 ? Math.round((s.count / totalFindings) * 100) : 0}%; background:${s.color}; height:100%;"></div>
      </div>
      <span style="font-family:Georgia,serif; font-size:16px; font-weight:700; color:${s.color}; min-width:24px; text-align:right;">${s.count}</span>
    </div>
  `).join('')}

  ${project.description ? `
  <div style="margin-top:36px; padding:20px 24px; background:${BG};">
    <p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#888; margin-bottom:8px;">Audit Scope</p>
    <p style="font-family:-apple-system,sans-serif; font-size:14px; color:#444; line-height:1.6;">${escapeHtml(project.description)}</p>
  </div>` : ''}
</div>

<!-- ══════════════════════════════════════
     FINDINGS PAGES
══════════════════════════════════════ -->
<div style="padding: 80px 80px 64px 80px; background:white; page-break-before:always;">
  ${project.clientName ? `<p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:${RED}; margin-bottom:16px;">${escapeHtml(project.clientName)}</p>` : ''}
  <h2 style="font-family:Georgia,serif; font-size:32px; font-weight:700; color:#1a1a1a; margin-bottom:12px;">Detailed Findings</h2>
  <div style="width:40px; height:4px; background:${RED}; margin-bottom:40px;"></div>
  ${findingsHtml || '<p style="font-family:-apple-system,sans-serif; font-size:14px; color:#aaa; font-style:italic;">No findings recorded for this project.</p>'}
</div>

</body>
</html>`
}

function buildVpatHtml(
  project: typeof projects.$inferSelect,
  findingsData: Array<typeof findings.$inferSelect & { standards: string[] }>
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const RED = '#c0392b'
  const BG = '#f5f0ef'

  // Group findings by WCAG criterion
  const findingsByCriterion = new Map<string, typeof findingsData>()
  findingsData.forEach((f) => {
    if (f.wcagCriterion) {
      if (!findingsByCriterion.has(f.wcagCriterion)) {
        findingsByCriterion.set(f.wcagCriterion, [])
      }
      findingsByCriterion.get(f.wcagCriterion)!.push(f)
    }
  })

  // WCAG 2.2 Criteria (subset for brevity in VPAT)
  const wcagCriteria = [
    { id: '1.1.1', name: 'Non-text Content', level: 'A' },
    { id: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
    { id: '1.4.1', name: 'Use of Color', level: 'A' },
    { id: '2.1.1', name: 'Keyboard', level: 'A' },
    { id: '2.4.1', name: 'Bypass Blocks', level: 'A' },
    { id: '3.1.1', name: 'Language of Page', level: 'A' },
    { id: '3.2.1', name: 'On Focus', level: 'A' },
    { id: '4.1.1', name: 'Parsing', level: 'A' }
  ]

  function getAssessment(criterion: string): string {
    const issues = findingsByCriterion.get(criterion) || []
    if (issues.length === 0) return 'Supports'
    const hasOpen = issues.some((f) => f.status !== 'resolved' && f.status !== 'wont_fix')
    return hasOpen ? 'Does Not Support' : 'Supports'
  }

  const rows = wcagCriteria.map((c) => {
    const assessment = getAssessment(c.id)
    const issues = findingsByCriterion.get(c.id) || []
    const remarks = issues.length > 0 ? `${issues.length} issue${issues.length !== 1 ? 's' : ''} found` : ''

    return `
      <tr style="border-bottom: 1px solid #e0dbd9;">
        <td style="padding: 12px 16px; font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 600;">${escapeHtml(c.id)}</td>
        <td style="padding: 12px 16px; font-family: -apple-system, sans-serif; font-size: 14px;">${escapeHtml(c.name)}</td>
        <td style="padding: 12px 16px; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 600; color: ${assessment === 'Supports' ? '#2d7a4f' : '#c0392b'};">${assessment}</td>
        <td style="padding: 12px 16px; font-family: -apple-system, sans-serif; font-size: 12px; color: #666;">${remarks}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VPAT — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  @page { margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>

<div style="padding: 80px; background:${BG}; min-height:100vh; display:flex; flex-direction:column; justify-content:space-between;">
  <div>
    <h1 style="font-family:Georgia,'Times New Roman',serif; font-size:48px; font-weight:700; color:#1a1a1a; margin-bottom:20px;">VPAT®</h1>
    <p style="font-family:-apple-system,sans-serif; font-size:13px; color:#666; margin-bottom:40px;">Voluntary Product Accessibility Template</p>

    <div style="background:white; padding:30px; border-radius:8px; margin-bottom:40px;">
      <p style="font-family:-apple-system,sans-serif; font-size:11px; color:#666; margin-bottom:8px;"><strong>Product Name:</strong> ${escapeHtml(project.name)}</p>
      ${project.clientName ? `<p style="font-family:-apple-system,sans-serif; font-size:11px; color:#666; margin-bottom:8px;"><strong>Organization:</strong> ${escapeHtml(project.clientName)}</p>` : ''}
      ${project.url ? `<p style="font-family:-apple-system,sans-serif; font-size:11px; color:#666; margin-bottom:8px;"><strong>Product URL:</strong> ${escapeHtml(project.url)}</p>` : ''}
      <p style="font-family:-apple-system,sans-serif; font-size:11px; color:#666;"><strong>Report Date:</strong> ${date}</p>
    </div>
  </div>
</div>

<div style="padding: 80px; background:white; page-break-before:always;">
  <h2 style="font-family:Georgia,serif; font-size:32px; font-weight:700; color:#1a1a1a; margin-bottom:30px;">WCAG 2.2 Level A Conformance</h2>

  <table style="border: 1px solid #e0dbd9;">
    <thead>
      <tr style="background:#f9f6f5; border-bottom: 2px solid #e0dbd9;">
        <th style="padding: 12px 16px; text-align: left; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Criterion</th>
        <th style="padding: 12px 16px; text-align: left; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Name</th>
        <th style="padding: 12px 16px; text-align: left; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Assessment</th>
        <th style="padding: 12px 16px; text-align: left; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <p style="font-family:-apple-system,sans-serif; font-size:11px; color:#aaa; margin-top:40px;">Generated ${date} · Echo Accessibility Audit Tool</p>
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
