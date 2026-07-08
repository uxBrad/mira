import { IpcMain, BrowserWindow, dialog } from 'electron'
import { getDb } from '../../db'
import { projects, findings } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { writeFileSync, readFileSync } from 'fs'
import { extname } from 'path'

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
    const filePath = result.filePaths[0]
    const ext = extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png'
    const buffer = readFileSync(filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
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

  ipcMain.handle('export:pdf', async (_, projectId: string, format: 'summary' | 'vpat' = 'summary', auditState?: { criteriaVerdict: Record<string, 'pass' | 'partial' | 'na' | 'fail'>; criteriaProgress: Partial<Record<string, 'complete'>>; criterionNotes?: Record<string, string>; auditorName?: string; auditorCredentials?: string; auditorEmail?: string }) => {
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

      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Report as PDF',
        defaultPath: `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-accessibility-report-${format}.pdf`,
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
        ? buildVpatHtml(project, findingsData, auditState || { criteriaVerdict: {}, criteriaProgress: {}, criterionNotes: {} })
        : buildReportHtml(project, findingsData, auditState)
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
        margins: { marginType: 'none' },
        landscape: format !== 'vpat'
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

// Inline lucide icons (ISC licensed) so the PDF renderer needs no external assets
const ICON_BADGE_CHECK = `<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>`
const ICON_TRIANGLE_ALERT = `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`
const ICON_FILE = `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>`
const ICON_EYE = `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>`
const ICON_BRAIN = `<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>`
const ICON_FOOTPRINTS = `<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>`
const ICON_PUZZLE = `<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>`
function icon(paths: string, color: string, size = 40): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

// Maps each WCAG 2.2 A/AA criterion to its POUR principle, mirroring src/lib/utils.ts WCAG_CRITERIA
const CRITERION_PRINCIPLE: Record<string, 'perception' | 'action' | 'cognition' | 'interaction'> = {
  '1.1.1': 'perception', '1.2.1': 'perception', '1.2.2': 'perception', '1.2.3': 'perception', '1.2.4': 'perception', '1.2.5': 'perception',
  '1.3.1': 'perception', '1.3.2': 'perception', '1.3.3': 'perception', '1.3.4': 'perception', '1.3.5': 'perception',
  '1.4.1': 'perception', '1.4.2': 'perception', '1.4.3': 'perception', '1.4.4': 'perception', '1.4.5': 'perception',
  '1.4.10': 'perception', '1.4.11': 'perception', '1.4.12': 'perception', '1.4.13': 'perception', '2.3.1': 'perception',
  '2.1.1': 'action', '2.1.2': 'action', '2.1.4': 'action', '2.2.1': 'action', '2.2.2': 'action', '2.4.1': 'action',
  '2.4.3': 'action', '2.4.7': 'action', '2.4.11': 'action', '2.5.1': 'action', '2.5.2': 'action', '2.5.4': 'action',
  '2.5.7': 'action', '2.5.8': 'action',
  '2.4.2': 'cognition', '2.4.5': 'cognition', '2.4.6': 'cognition', '3.1.1': 'cognition', '3.1.2': 'cognition',
  '3.2.3': 'cognition', '3.2.4': 'cognition', '3.2.6': 'cognition', '3.3.2': 'cognition',
  '2.4.4': 'interaction', '2.5.3': 'interaction', '3.2.1': 'interaction', '3.2.2': 'interaction', '3.3.1': 'interaction',
  '3.3.3': 'interaction', '3.3.4': 'interaction', '3.3.7': 'interaction', '3.3.8': 'interaction',
  '4.1.1': 'interaction', '4.1.2': 'interaction', '4.1.3': 'interaction'
}
const CATEGORY_ORDER = ['perception', 'action', 'cognition', 'interaction'] as const
const CATEGORY_META: Record<string, { label: string; description: string; icon: string; color: string }> = {
  perception: { label: 'Perceivable', description: 'Information and user interface components must be presentable to users in ways they can perceive.', icon: ICON_EYE, color: '#2563eb' },
  action: { label: 'Operable', description: 'User interface components and navigation must be operable.', icon: ICON_FOOTPRINTS, color: '#0d9488' },
  cognition: { label: 'Understandable', description: 'Information and the operation of the user interface must be understandable.', icon: ICON_BRAIN, color: '#7c3aed' },
  interaction: { label: 'Robust', description: 'Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.', icon: ICON_PUZZLE, color: '#db2777' }
}

function buildReportHtml(
  project: typeof projects.$inferSelect,
  findingsData: Array<typeof findings.$inferSelect & { standards: string[] }>,
  auditState?: { criteriaVerdict: Record<string, 'pass' | 'partial' | 'na' | 'fail'>; criteriaProgress: Partial<Record<string, 'complete'>> }
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const RED = '#c0392b'
  const GREEN = '#2d7a4f'
  const BG = '#f5f0ef'
  const INK = '#1a1a1a'
  const MUTED = '#6b7280'
  const BORDER = '#e5e5e5'
  const wcagLevel = project.standards || 'WCAG 2.2 AA'

  // Pass rate — computed only over criteria with a definitive verdict so far
  const criteriaWithActiveFindings = new Set(
    findingsData
      .filter(f => f.wcagCriterion && f.status !== 'resolved' && f.status !== 'wont_fix')
      .map(f => f.wcagCriterion!)
  )
  const effectiveVerdicts: Record<string, 'pass' | 'partial' | 'na' | 'fail'> = { ...(auditState?.criteriaVerdict ?? {}) }
  criteriaWithActiveFindings.forEach(cid => { effectiveVerdicts[cid] = 'fail' })
  const passCount = Object.values(effectiveVerdicts).filter(v => v === 'pass').length
  const failCount = Object.values(effectiveVerdicts).filter(v => v === 'fail').length
  const evaluatedCount = passCount + failCount
  const passRate = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 0
  const complianceStanding = passRate >= 90 ? 'Excellent' : passRate >= 75 ? 'Good' : passRate >= 50 ? 'Fair' : 'Needs Work'

  // Only outstanding (not resolved / not won't-fix) findings "require action"
  const activeFindings = findingsData.filter(f => f.status !== 'resolved' && f.status !== 'wont_fix')
  const pagesAffectedCount = new Set(activeFindings.filter(f => f.pageUrl).map(f => f.pageUrl)).size

  // Category breakdown — buckets findings by their WCAG POUR principle, derived from wcagCriterion.
  // The 4 real principles always show (even at zero) so the page reads as a complete picture;
  // "Uncategorized" only shows up when there's actually a finding with no mapped criterion.
  const categoryStats = [...CATEGORY_ORDER, 'uncategorized'].map((cat) => {
    const items = cat === 'uncategorized'
      ? activeFindings.filter(f => !f.wcagCriterion || !CRITERION_PRINCIPLE[f.wcagCriterion])
      : activeFindings.filter(f => f.wcagCriterion && CRITERION_PRINCIPLE[f.wcagCriterion] === cat)
    return {
      key: cat,
      label: cat === 'uncategorized' ? 'Uncategorized' : CATEGORY_META[cat].label,
      description: cat === 'uncategorized' ? 'Findings not yet assigned a category.' : CATEGORY_META[cat].description,
      iconSvg: cat === 'uncategorized' ? ICON_TRIANGLE_ALERT : CATEGORY_META[cat].icon,
      color: cat === 'uncategorized' ? '#6b7280' : CATEGORY_META[cat].color,
      count: items.length,
      pagesWithIssues: new Set(items.filter(f => f.pageUrl).map(f => f.pageUrl)).size
    }
  }).filter(c => c.key !== 'uncategorized' || c.count > 0)

  // Derive a human-readable audit type from the project standards field
  const auditTypeLabel = project.standards
    ? `${escapeHtml(project.standards)} Compliance Audit`
    : 'Accessibility Compliance Audit'

  function bigCard(opts: { iconSvg: string; iconColor: string; label: string; headline: string; headlineColor: string; body: string }): string {
    return `
    <div style="flex:1.4; background:white; border:1px solid ${BORDER}; border-radius:16px; padding:40px 32px; display:flex; flex-direction:column; align-items:center; text-align:center;">
      <div style="width:64px; height:64px; border-radius:50%; border:1.5px solid ${BORDER}; display:flex; align-items:center; justify-content:center; margin-bottom:20px;">${opts.iconSvg}</div>
      <p style="font-family:-apple-system,sans-serif; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:${MUTED}; margin-bottom:10px;">${opts.label}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:32px; font-weight:800; color:${opts.headlineColor}; margin-bottom:18px;">${opts.headline}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:13px; color:${MUTED}; line-height:1.7; max-width:400px;">${opts.body}</p>
    </div>`
  }

  function smallStatCard(label: string, value: string, caption: string, valueColor = INK, borderColor = BORDER): string {
    return `
    <div style="background:white; border:1px solid ${borderColor}; border-radius:12px; padding:18px 20px; flex:1;">
      <p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${MUTED}; margin-bottom:8px;">${label}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:26px; font-weight:800; color:${valueColor}; margin-bottom:6px;">${value}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:11px; color:${MUTED}; line-height:1.5;">${caption}</p>
    </div>`
  }

  function topStatCard(iconSvg: string, iconColor: string, value: string, label: string): string {
    return `
    <div style="flex:1; border:1px solid ${BORDER}; border-radius:12px; padding:24px; background:white;">
      <div style="margin-bottom:16px;">${icon(iconSvg, iconColor, 28)}</div>
      <p style="font-family:-apple-system,sans-serif; font-size:30px; font-weight:800; color:#1d4ed8; margin-bottom:6px;">${value}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:13px; color:${MUTED}; line-height:1.4;">${label}</p>
    </div>`
  }

  function categoryCard(cat: typeof categoryStats[number]): string {
    return `
    <div style="border:1.5px solid ${cat.color}; border-radius:12px; padding:24px; background:white;">
      <p style="font-family:-apple-system,sans-serif; font-size:16px; font-weight:700; color:${INK}; margin-bottom:8px;">${escapeHtml(cat.label)}</p>
      <p style="font-family:-apple-system,sans-serif; font-size:24px; font-weight:800; color:#1d4ed8; margin-bottom:2px;">${cat.count} <span style="font-size:13px; font-weight:600; color:${MUTED};">issue${cat.count !== 1 ? 's' : ''}</span></p>
      <p style="font-family:-apple-system,sans-serif; font-size:12px; color:${MUTED}; margin-bottom:14px;">${cat.pagesWithIssues} page${cat.pagesWithIssues !== 1 ? 's' : ''} with issues</p>
      <div style="height:1px; background:#f0f0f0; margin-bottom:14px;"></div>
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px;">
        <p style="font-family:-apple-system,sans-serif; font-size:12px; color:${MUTED}; line-height:1.6; flex:1;">${escapeHtml(cat.description)}</p>
        <div style="flex-shrink:0; opacity:0.5;">${icon(cat.iconSvg, cat.color, 28)}</div>
      </div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Accessibility Audit Report — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1a1a1a; }
  @page { margin-top: 64px; margin-right: 0; margin-bottom: 0; margin-left: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- ══════════════════════════════════════
     COVER PAGE
══════════════════════════════════════ -->
<div style="min-height:100vh; background:white; padding: 8px 80px 56px; display:flex; flex-direction:column; justify-content:space-between;">
  <div>
    ${project.clientLogoPath ? `<img src="${project.clientLogoPath}" alt="${project.clientName ? escapeHtml(project.clientName) + ' logo' : 'Client logo'}" style="max-height:48px; max-width:220px; object-fit:contain; margin-bottom:16px; display:block;">` : ''}
    ${project.clientName ? `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:${RED}; margin-bottom:24px;">${escapeHtml(project.clientName)}</p>` : ''}

    <h1 style="font-family:Georgia,'Times New Roman',serif; font-size:48px; font-weight:700; line-height:1.15; color:#1a1a1a; margin-bottom:20px;">
      ${escapeHtml(auditTypeLabel)}
    </h1>

    <div style="width:56px; height:5px; background:${RED}; margin-bottom:40px;"></div>

    ${project.name !== auditTypeLabel ? `<p style="font-family:-apple-system,sans-serif; font-size:16px; color:#555; margin-bottom:8px;">${escapeHtml(project.name)}</p>` : ''}
    ${project.url ? `<p style="font-family:-apple-system,sans-serif; font-size:13px; color:#888;">${escapeHtml(project.url)}</p>` : ''}
  </div>
  <p style="font-family:-apple-system,sans-serif; font-size:12px; color:#aaa;">Generated ${date} · Mira</p>
</div>

<!-- ══════════════════════════════════════
     OVERALL COMPLIANCE
══════════════════════════════════════ -->
<div style="padding: 56px 80px 40px; background:white; page-break-before:always;">
  <h2 style="font-family:-apple-system,sans-serif; font-size:24px; font-weight:800; color:${INK}; margin-bottom:20px;">Overall Compliance</h2>
  <div style="display:flex; gap:16px; align-items:stretch;">
    ${bigCard({
      iconSvg: icon(ICON_BADGE_CHECK, GREEN),
      iconColor: GREEN,
      label: 'Overall Compliance',
      headline: `${evaluatedCount > 0 ? passRate : 0}% Compliant`,
      headlineColor: INK,
      body: evaluatedCount > 0
        ? `${complianceStanding} compliance rate. The compliance percentage shows how many WCAG criteria ${escapeHtml(project.name)} passed out of all criteria evaluated so far. <strong>${passCount} criteria passed out of ${evaluatedCount} evaluated</strong>, which is ${passRate}% compliance. Criteria not yet evaluated or marked not applicable are not counted.`
        : `No criteria have been evaluated yet. Once the step-by-step audit records pass/fail verdicts, this card will show the live compliance percentage.`
    })}
    <div style="flex:1; display:flex; flex-direction:column; gap:16px;">
      ${smallStatCard('Passed Tests', String(passCount), 'Criteria that passed evaluation')}
      ${smallStatCard('Pass Rate', evaluatedCount > 0 ? `${passRate}%` : '—', 'Percentage of evaluated criteria passing')}
      ${smallStatCard('WCAG Level', escapeHtml(wcagLevel), 'Standard being tested against')}
    </div>
  </div>

  ${project.scope ? `
  <div style="margin-top:24px; padding:20px 24px; background:${BG}; border-radius:12px;">
    <p style="font-family:-apple-system,sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#888; margin-bottom:8px;">Audit Scope</p>
    <p style="font-family:-apple-system,sans-serif; font-size:14px; color:#444; line-height:1.6;">${escapeHtml(project.scope)}</p>
  </div>` : ''}

  <!-- ── Detailed Findings ── -->
  <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-top:36px;">
    <div>
      <h2 style="font-family:-apple-system,sans-serif; font-size:26px; font-weight:800; color:${INK};">Detailed Findings</h2>
      <p style="font-family:-apple-system,sans-serif; font-size:14px; color:${MUTED}; margin-top:4px;">Accessibility Issues Summary</p>
    </div>
    <p style="font-family:-apple-system,sans-serif; font-size:12px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:${INK};">Mira</p>
  </div>
  <div style="height:1px; background:${BORDER}; margin:20px 0 32px;"></div>

  <div style="display:flex; gap:16px;">
    ${topStatCard(ICON_TRIANGLE_ALERT, INK, String(activeFindings.length), 'Issue Types Found')}
    ${topStatCard(ICON_FILE, INK, String(pagesAffectedCount), 'Pages Affected')}
  </div>
</div>

${categoryStats.length > 0 ? `
<!-- ══════════════════════════════════════
     ISSUES BY CATEGORY
══════════════════════════════════════ -->
<div style="padding: 48px 80px 40px; background:white; page-break-before:always;">
  <h2 style="font-family:-apple-system,sans-serif; font-size:26px; font-weight:800; color:${INK}; margin-bottom:20px;">Issues by Category</h2>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
    ${categoryStats.map(categoryCard).join('')}
  </div>
</div>` : ''}

<!-- ══════════════════════════════════════
     ABOUT THIS REPORT
══════════════════════════════════════ -->
<div style="padding: 48px 80px 40px; background:white; page-break-before:always;">
  <h2 style="font-family:-apple-system,sans-serif; font-size:26px; font-weight:800; color:${INK}; margin-bottom:20px;">About This Report</h2>
  <div style="height:1px; background:${BORDER}; margin:0 0 32px;"></div>

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:56px;">
    <div>
      <h3 style="font-family:-apple-system,sans-serif; font-size:14px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${MUTED}; margin-bottom:10px;">What is this report?</h3>
      <p style="font-family:-apple-system,sans-serif; font-size:13px; color:#444; line-height:1.7; margin-bottom:28px;">
        This report summarizes the accessibility audit conducted for <strong>${escapeHtml(project.name)}</strong> against ${escapeHtml(wcagLevel)}. It is intended to give both technical and non-technical stakeholders a clear picture of overall compliance and the issues that need attention.
      </p>

      <h3 style="font-family:-apple-system,sans-serif; font-size:14px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${MUTED}; margin-bottom:10px;">Methodology</h3>
      <p style="font-family:-apple-system,sans-serif; font-size:13px; color:#444; line-height:1.7;">
        This audit was conducted using a combination of manual inspection and assistive-technology testing, evaluated against WCAG success criteria. Testing included keyboard navigation, screen reader compatibility, color contrast verification, and functional testing of interactive components.
      </p>
    </div>
    <div>
      <h3 style="font-family:-apple-system,sans-serif; font-size:14px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${MUTED}; margin-bottom:10px;">WCAG Principles</h3>
      <div style="margin-bottom:28px;">
        ${CATEGORY_ORDER.map((cat) => `
          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${CATEGORY_META[cat].color}; margin-top:4px; flex-shrink:0;"></div>
            <p style="font-family:-apple-system,sans-serif; font-size:13px; color:#444; line-height:1.5;"><strong style="color:${INK};">${CATEGORY_META[cat].label}</strong> — ${CATEGORY_META[cat].description}</p>
          </div>
        `).join('')}
      </div>

      <h3 style="font-family:-apple-system,sans-serif; font-size:14px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${MUTED}; margin-bottom:10px;">Disclaimer</h3>
      <p style="font-family:-apple-system,sans-serif; font-size:13px; color:#444; line-height:1.7;">
        This assessment is based on the pages and components in scope at the time of testing and reflects a point-in-time evaluation. It is not a legal certification of accessibility. Generated ${date} using Mira.
      </p>
    </div>
  </div>
</div>

</body>
</html>`
}

// WCAG criterion descriptions for VPAT report
const CRITERION_DESCRIPTIONS: Record<string, string> = {
  '1.1.1': 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
  '1.2.1': 'For prerecorded audio-only and prerecorded video-only media, an alternative for time-based media is provided.',
  '1.2.2': 'Captions are provided for all prerecorded audio content in synchronized media.',
  '1.2.3': 'An alternative for time-based media or audio track is provided for prerecorded video-only content.',
  '1.2.4': 'Captions are provided for all live audio content in synchronized media.',
  '1.2.5': 'Audio description is provided for all prerecorded video content in synchronized media.',
  '1.3.1': 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
  '1.3.2': 'When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.',
  '1.3.3': 'Instructions provided for understanding and operating content do not rely solely on shape, size, visual location, orientation, or sound.',
  '1.3.4': 'Content does not restrict its view and operation to a single display orientation.',
  '1.3.5': 'The purpose of each input field collecting information about the user can be programmatically determined when the input serves a known purpose.',
  '1.4.1': 'Color is not used as the only visual means of conveying information, indicating an action, or prompting a response.',
  '1.4.2': 'If audio plays automatically for more than 3 seconds, a mechanism is available to pause or stop the audio, or control audio volume.',
  '1.4.3': 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.',
  '1.4.4': 'Except for captions and images of text, text can be resized without loss of content or functionality up to 200 percent.',
  '1.4.5': 'Images of text are not used except where a particular visual presentation of text is essential.',
  '1.4.10': 'Content can be presented without loss of information or functionality at a width of 320 CSS pixels.',
  '1.4.11': 'The visual presentation of the following has a contrast ratio of at least 3:1 against adjacent color(s): user interface components and graphical elements.',
  '1.4.12': 'No loss of content or functionality occurs when line height is set to 1.5 or letter spacing is set to 0.12 times the font size.',
  '1.4.13': 'For content that appears on hover or focus, a mechanism is available to dismiss it without moving pointer or keyboard focus.',
  '2.1.1': 'All functionality of the content is operable through a keyboard interface.',
  '2.1.2': 'If keyboard focus can be moved to a component using a keyboard interface, then focus can be moved away from that component using only a keyboard interface.',
  '2.1.4': 'If a keyboard shortcut is implemented in content using printable characters, then a mechanism is available to turn off the shortcut.',
  '2.2.1': 'For each time limit that is set by the content, at least one of the following is true: the user is allowed to turn off the time limit, adjust it, or extend it.',
  '2.2.2': 'For moving, blinking, scrolling, or auto-updating information, a mechanism is available to pause, stop, hide, or control the frequency of the update.',
  '2.3.1': 'Web pages do not contain anything that flashes more than three times in any one second period.',
  '2.4.1': 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.',
  '2.4.2': 'Web pages have titles that describe topic or purpose.',
  '2.4.3': 'If a Web page can be navigated sequentially and the navigation sequences affect the meaning or operation, focus order follows relationships in the content.',
  '2.4.4': 'The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context.',
  '2.4.5': 'More than one way is available to locate a Web page within a set of Web pages except where the Web Page is the result of, or a step in, a process.',
  '2.4.6': 'Headings and labels describe topic or purpose.',
  '2.4.7': 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
  '2.4.11': 'For user interface components with a visible focus indicator, when the component receives keyboard focus, the focus indicator is visible.',
  '2.5.1': 'All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer without a path-based gesture.',
  '2.5.2': 'For functionality that can be operated using a single pointer, at least one of the following is true regarding the down-event.',
  '2.5.3': 'For user interface components with labels that include text or images of text, the name contains the text that is presented visually.',
  '2.5.4': 'Functionality that can be operated by device motion or user motion can also be operated by user interface components.',
  '2.5.7': 'Dragging movements can be accomplished by single pointer activation without relying on simultaneous multi-point contact or a specific speed of movement.',
  '2.5.8': 'The target size for pointer inputs is at least 24 by 24 CSS pixels except where a smaller target is available and the larger target is adjacent.',
  '3.1.1': 'The default human language of each Web page can be programmatically determined.',
  '3.1.2': 'The human language of each passage or phrase in the content can be programmatically determined except for proper names, technical terms, words of indeterminate language, and words or phrases that have become part of the vernacular of the immediately surrounding text.',
  '3.2.1': 'When any user interface component receives focus, it does not cause a change of context.',
  '3.2.2': 'Changing the setting of any user interface component does not automatically cause a change of context unless the user has been informed of the behavior.',
  '3.2.3': 'Repeated components that appear in multiple Web pages within a set of Web pages are in the same relative order each time they appear.',
  '3.2.4': 'Components that have the same functionality are identified consistently.',
  '3.2.6': 'Help is available through multiple modalities.',
  '3.3.1': 'If an error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
  '3.3.2': 'Labels or instructions are provided when content requires user input.',
  '3.3.3': 'If an error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user.',
  '3.3.4': 'For Web pages that cause legal commitments or financial transactions, a mechanism is available to review, confirm, and correct information before finalizing the submission.',
  '3.3.7': 'A mechanism is available for the user to avoid mistakes in form submission.',
  '3.3.8': 'A mechanism is available to help users avoid mistakes when performing an action that causes a legal commitment or financial transaction.',
  '4.1.1': 'In content implemented using markup languages, elements have complete start and end tags, elements are nested according to their specifications, and elements do not have duplicate attributes.',
  '4.1.2': 'For all user interface components, the name and role can be programmatically determined; states, properties, and values that can be set by the user are programmatically set; and changes to these items are available to user agents.',
  '4.1.3': 'In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus.'
}

function buildVpatHtml(
  project: typeof projects.$inferSelect,
  findingsData: Array<typeof findings.$inferSelect & { standards: string[] }>,
  auditState: { criteriaVerdict: Record<string, 'pass' | 'partial' | 'na' | 'fail'>; criteriaProgress: Partial<Record<string, 'complete'>>; criterionNotes?: Record<string, string>; auditorName?: string; auditorCredentials?: string; auditorEmail?: string }
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // All WCAG 2.2 criteria (57 total)
  const allCriteria = [
    // Level A (26 criteria)
    { id: '1.1.1', name: 'Non-text Content', level: 'A' },
    { id: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
    { id: '1.2.2', name: 'Captions (Prerecorded)', level: 'A' },
    { id: '1.2.3', name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
    { id: '1.3.2', name: 'Meaningful Sequence', level: 'A' },
    { id: '1.3.3', name: 'Sensory Characteristics', level: 'A' },
    { id: '1.4.1', name: 'Use of Color', level: 'A' },
    { id: '1.4.2', name: 'Audio Control', level: 'A' },
    { id: '2.1.1', name: 'Keyboard', level: 'A' },
    { id: '2.1.2', name: 'No Keyboard Trap', level: 'A' },
    { id: '2.1.4', name: 'Character Key Shortcuts', level: 'A' },
    { id: '2.2.1', name: 'Timing Adjustable', level: 'A' },
    { id: '2.2.2', name: 'Pause, Stop, Hide', level: 'A' },
    { id: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A' },
    { id: '2.4.1', name: 'Bypass Blocks', level: 'A' },
    { id: '2.4.2', name: 'Page Titled', level: 'A' },
    { id: '2.4.3', name: 'Focus Order', level: 'A' },
    { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
    { id: '2.5.1', name: 'Pointer Gestures', level: 'A' },
    { id: '2.5.2', name: 'Pointer Cancellation', level: 'A' },
    { id: '2.5.3', name: 'Label in Name', level: 'A' },
    { id: '2.5.4', name: 'Motion Actuation', level: 'A' },
    { id: '3.1.1', name: 'Language of Page', level: 'A' },
    { id: '3.2.1', name: 'On Focus', level: 'A' },
    { id: '3.2.2', name: 'On Input', level: 'A' },
    { id: '3.3.1', name: 'Error Identification', level: 'A' },
    { id: '3.3.2', name: 'Labels or Instructions', level: 'A' },
    { id: '3.3.7', name: 'Redundant Entry', level: 'A' },
    { id: '4.1.1', name: 'Parsing', level: 'A' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
    // Level AA (31 criteria)
    { id: '1.2.4', name: 'Captions (Live)', level: 'AA' },
    { id: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA' },
    { id: '1.3.4', name: 'Orientation', level: 'AA' },
    { id: '1.3.5', name: 'Identify Input Purpose', level: 'AA' },
    { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
    { id: '1.4.4', name: 'Resize Text', level: 'AA' },
    { id: '1.4.5', name: 'Images of Text', level: 'AA' },
    { id: '1.4.10', name: 'Reflow', level: 'AA' },
    { id: '1.4.11', name: 'Non-text Contrast', level: 'AA' },
    { id: '1.4.12', name: 'Text Spacing', level: 'AA' },
    { id: '1.4.13', name: 'Content on Hover or Focus', level: 'AA' },
    { id: '2.4.5', name: 'Multiple Ways', level: 'AA' },
    { id: '2.4.6', name: 'Headings and Labels', level: 'AA' },
    { id: '2.4.7', name: 'Focus Visible', level: 'AA' },
    { id: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA' },
    { id: '2.5.7', name: 'Dragging Movements', level: 'AA' },
    { id: '2.5.8', name: 'Target Size (Minimum)', level: 'AA' },
    { id: '3.1.2', name: 'Language of Parts', level: 'AA' },
    { id: '3.2.3', name: 'Consistent Navigation', level: 'AA' },
    { id: '3.2.4', name: 'Consistent Identification', level: 'AA' },
    { id: '3.2.6', name: 'Consistent Help', level: 'AA' },
    { id: '3.3.3', name: 'Error Suggestion', level: 'AA' },
    { id: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA' },
    { id: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA' },
    { id: '4.1.3', name: 'Status Messages', level: 'AA' }
  ]

  // Group findings by criterion
  const findingsByCriterion = new Map<string, typeof findingsData>()
  findingsData.forEach((f) => {
    if (f.wcagCriterion) {
      if (!findingsByCriterion.has(f.wcagCriterion)) {
        findingsByCriterion.set(f.wcagCriterion, [])
      }
      findingsByCriterion.get(f.wcagCriterion)!.push(f)
    }
  })

  // Determine conformance level for a criterion
  function getConformanceLevel(criterionId: string): { level: string; color: string } {
    const verdict = auditState.criteriaVerdict[criterionId] ?? null
    const issues = findingsByCriterion.get(criterionId) || []
    const hasOpenIssues = issues.some((f) => f.status !== 'resolved' && f.status !== 'wont_fix')

    // Open findings always override to Does Not Support
    if (hasOpenIssues) {
      return { level: 'Does Not Support', color: '#c0392b' }
    }

    if (verdict === 'pass' || (verdict === 'fail' && issues.length > 0 && !hasOpenIssues)) {
      return { level: 'Supports', color: '#2d7a4f' }
    } else if (verdict === 'partial') {
      return { level: 'Partially Supports', color: '#d97706' }
    } else if (verdict === 'na') {
      return { level: 'Not Applicable', color: '#6b7280' }
    } else if (verdict === 'fail') {
      return { level: 'Does Not Support', color: '#c0392b' }
    } else {
      return { level: 'Not Evaluated', color: '#999' }
    }
  }

  // Build remarks cell content from finding details (title, description, recommendations, notes)
  function getRemarks(criterionId: string): string {
    const issues = findingsByCriterion.get(criterionId) || []
    const parts: string[] = []

    const displayed = issues.slice(0, 3)
    for (const i of displayed) {
      const title = escapeHtml(i.title || 'Unnamed issue')
      const locationParts = [i.pageUrl, i.component].filter(Boolean).map(s => escapeHtml(s!))
      const location = locationParts.length ? ` <span style="color:#6b7280">— ${locationParts.join(', ')}</span>` : ''
      const firstSentence = i.description
        ? i.description.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0].trim().slice(0, 140)
        : ''
      const desc = firstSentence
        ? `<br><span style="color:#666;font-size:9px">${escapeHtml(firstSentence)}${firstSentence.length >= 140 ? '…' : ''}</span>`
        : ''
      const rec = i.recommendations
        ? `<br><span style="color:#2d7a4f;font-size:9px"><strong>Rec:</strong> ${escapeHtml(i.recommendations.slice(0, 160))}${i.recommendations.length > 160 ? '…' : ''}</span>`
        : ''
      const note = i.notes
        ? `<br><span style="color:#888;font-size:9px;font-style:italic">${escapeHtml(i.notes.slice(0, 120))}${i.notes.length > 120 ? '…' : ''}</span>`
        : ''

      parts.push(`<strong style="font-size:10px">${title}</strong>${location}${desc}${rec}${note}`)
    }

    if (issues.length > 3) {
      parts.push(`<span style="color:#888;font-style:italic;font-size:9px">…and ${issues.length - 3} more finding${issues.length - 3 > 1 ? 's' : ''}</span>`)
    }

    return parts.join('<br><br>')
  }

  const RED = '#c0392b'

  // Build detailed criteria rows with criterion text and remarks
  function buildDetailedTableRows(level: 'A' | 'AA'): string {
    const criteria = allCriteria.filter((c) => c.level === level)
    return criteria.map((c) => {
      const { level: conformanceLevel, color } = getConformanceLevel(c.id)
      const remarks = getRemarks(c.id)
      const criterionText = CRITERION_DESCRIPTIONS[c.id] || 'See WCAG 2.2 Guidelines for full criterion description.'

      return `
        <tr style="border-bottom: 1px solid #e0dbd9; page-break-inside: avoid;">
          <td style="padding: 16px 14px; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; vertical-align: top; width: 12%; min-width: 50px;">${escapeHtml(c.id)}<br><span style="font-size: 10px; font-weight: 400; color: #666;">${escapeHtml(c.name)}</span></td>
          <td style="padding: 16px 14px; font-family: -apple-system, sans-serif; font-size: 11px; color: #555; line-height: 1.5; vertical-align: top; width: 50%;">
            ${escapeHtml(criterionText)}
          </td>
          <td style="padding: 16px 14px; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 600; color: ${color}; background: ${color}15; vertical-align: top; width: 12%; min-width: 70px; text-align: center;">${conformanceLevel}</td>
          <td style="padding: 16px 14px; font-family: -apple-system, sans-serif; font-size: 10px; color: #666; line-height: 1.5; vertical-align: top; width: 26%;">${remarks || '—'}</td>
        </tr>
      `
    }).join('')
  }

  // Build standards table showing which WCAG versions are covered
  function buildStandardsTable(): string {
    const standards = [
      { name: 'Web Content Accessibility Guidelines 2.0', levelA: 'Yes', levelAA: 'Yes', levelAAA: 'No' },
      { name: 'Web Content Accessibility Guidelines 2.1', levelA: 'Yes', levelAA: 'Yes', levelAAA: 'No' },
      { name: 'Web Content Accessibility Guidelines 2.2', levelA: 'Yes', levelAA: 'Yes', levelAAA: 'No' }
    ]
    return standards.map(s => `
      <tr style="border-bottom: 1px solid #e0dbd9;">
        <td style="padding: 12px 14px; font-family: -apple-system, sans-serif; font-size: 11px;">${escapeHtml(s.name)}</td>
        <td style="padding: 12px 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px;">${s.levelA}</td>
        <td style="padding: 12px 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px;">${s.levelAA}</td>
        <td style="padding: 12px 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px;">${s.levelAAA}</td>
      </tr>
    `).join('')
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VPAT — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; }
  @page { margin: 0.5in; @bottom-right { content: counter(page); font-size: 10px; color: #999; font-family: -apple-system, sans-serif; } }
  @page :first { @bottom-right { content: none; } }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  h1 { font-family: Georgia, 'Times New Roman', serif; }
  h2 { font-family: Georgia, 'Times New Roman', serif; border-bottom: 2px solid #e0dbd9; padding-bottom: 12px; }
  .page { page-break-before: always; }
</style>
</head>
<body>

<!-- ════════════════════════════════════════
     PAGE 1: TITLE & PRODUCT INFORMATION
════════════════════════════════════════ -->
<div style="padding: 60px 50px; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between;">
  <div>
    ${project.clientLogoPath ? `<div style="margin-bottom: 24px;"><img src="${project.clientLogoPath}" alt="${project.clientName ? escapeHtml(project.clientName) + ' logo' : 'Client logo'}" style="max-height: 56px; max-width: 240px; object-fit: contain;"></div>` : ''}
    <h1 style="font-size: 48px; font-weight: 700; line-height: 1.1; margin-bottom: 8px; letter-spacing: -0.5px;">Accessibility Conformance Report</h1>
    <p style="font-size: 16px; color: #666; margin-bottom: 40px; font-weight: 500;">WCAG Edition (Based on VPAT® Version 2.4)</p>

    <div style="background: #f9f6f5; padding: 32px; border-left: 4px solid ${RED}; margin: 40px 0;">
      <p style="font-size: 13px; margin-bottom: 10px;"><strong>Name of Product/Version:</strong> ${escapeHtml(project.name)}</p>
      <p style="font-size: 13px; margin-bottom: 10px;"><strong>Report Date:</strong> ${date}</p>
      ${project.clientName ? `<p style="font-size: 13px; margin-bottom: 10px;"><strong>Organization:</strong> ${escapeHtml(project.clientName)}</p>` : ''}
      ${project.url ? `<p style="font-size: 13px; margin-bottom: 10px;"><strong>Product URL:</strong> ${escapeHtml(project.url)}</p>` : ''}
    </div>

    ${project.description ? `
    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Product Description</h3>
      <p style="font-size: 12px; color: #555; line-height: 1.7;">${escapeHtml(project.description)}</p>
    </div>
    ` : ''}

    ${project.scope ? `
    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Scope of Evaluation</h3>
      <p style="font-size: 12px; color: #555; line-height: 1.7;">${escapeHtml(project.scope)}</p>
    </div>
    ` : ''}

    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Contact Information</h3>
      <p style="font-size: 12px; color: #555;">For more information about this accessibility assessment, contact the organization responsible for the product.</p>
    </div>

    ${(auditState.auditorName || auditState.auditorCredentials || auditState.auditorEmail) ? `
    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Auditor</h3>
      ${auditState.auditorName ? `<p style="font-size: 12px; color: #555; margin-bottom: 4px;"><strong>${escapeHtml(auditState.auditorName)}</strong></p>` : ''}
      ${auditState.auditorCredentials ? `<p style="font-size: 12px; color: #888; margin-bottom: 4px;">${escapeHtml(auditState.auditorCredentials)}</p>` : ''}
      ${auditState.auditorEmail ? `<p style="font-size: 12px; color: #888;">${escapeHtml(auditState.auditorEmail)}</p>` : ''}
    </div>
    ` : ''}

    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Evaluation Methods Used</h3>
      <p style="font-size: 12px; color: #555; line-height: 1.7;">
        This accessibility audit was conducted using a combination of manual inspection and automated testing tools. The evaluation assessed conformance with WCAG 2.2 Success Criteria at levels A and AA. Testing included keyboard navigation, screen reader testing, color contrast verification, and functional testing of interactive components.
      </p>
    </div>

    ${project.testingEnvironment ? `
    <div style="margin: 32px 0;">
      <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">Testing Environment</h3>
      <p style="font-size: 12px; color: #555; line-height: 1.8; white-space: pre-line;">${escapeHtml(project.testingEnvironment)}</p>
    </div>
    ` : ''}
  </div>

  <div style="padding-top: 40px; border-top: 1px solid #e0dbd9;">
    <p style="font-size: 10px; color: #999;">Mira Accessibility Audit Tool</p>
  </div>
</div>

<!-- ════════════════════════════════════════
     PAGE 2: APPLICABLE STANDARDS
════════════════════════════════════════ -->
<div class="page" style="padding: 60px 50px;">
  <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 30px;">Applicable Standards/Guidelines</h2>

  <p style="font-size: 12px; color: #555; margin-bottom: 24px; line-height: 1.7;">
    This report covers the degree of conformance for the following accessibility standard/guidelines:
  </p>

  <table style="border: 1px solid #e0dbd9;">
    <thead>
      <tr style="background: #f9f6f5; border-bottom: 2px solid #e0dbd9;">
        <th style="padding: 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Standard/Guideline</th>
        <th style="padding: 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Level A</th>
        <th style="padding: 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Level AA</th>
        <th style="padding: 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #666;">Level AAA</th>
      </tr>
    </thead>
    <tbody>
      ${buildStandardsTable()}
    </tbody>
  </table>

</div>

<!-- ════════════════════════════════════════
     PAGE 3: TERMS & DEFINITIONS
════════════════════════════════════════ -->
<div class="page" style="padding: 60px 50px;">
  <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 30px;">Terms</h2>

  <p style="font-size: 12px; color: #555; margin-bottom: 24px; line-height: 1.7;">
    The terms used in the Conformance Level information are defined as follows:
  </p>

  <div style="margin-bottom: 24px;">
    <h4 style="font-size: 13px; font-weight: 700; color: #2d7a4f; margin-bottom: 8px;">• Supports</h4>
    <p style="font-size: 12px; color: #555; margin-left: 20px; line-height: 1.6;">
      The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
    </p>
  </div>

  <div style="margin-bottom: 24px;">
    <h4 style="font-size: 13px; font-weight: 700; color: #d97706; margin-bottom: 8px;">• Partially Supports</h4>
    <p style="font-size: 12px; color: #555; margin-left: 20px; line-height: 1.6;">
      Some functionality of the product does not meet the criterion.
    </p>
  </div>

  <div style="margin-bottom: 24px;">
    <h4 style="font-size: 13px; font-weight: 700; color: ${RED}; margin-bottom: 8px;">• Does Not Support</h4>
    <p style="font-size: 12px; color: #555; margin-left: 20px; line-height: 1.6;">
      The majority of product functionality does not meet the criterion.
    </p>
  </div>

  <div style="margin-bottom: 24px;">
    <h4 style="font-size: 13px; font-weight: 700; color: #999; margin-bottom: 8px;">• Not Applicable</h4>
    <p style="font-size: 12px; color: #555; margin-left: 20px; line-height: 1.6;">
      The criterion is not relevant to the product.
    </p>
  </div>

  <div style="margin-bottom: 24px;">
    <h4 style="font-size: 13px; font-weight: 700; color: #999; margin-bottom: 8px;">• Not Evaluated</h4>
    <p style="font-size: 12px; color: #555; margin-left: 20px; line-height: 1.6;">
      The product has not been evaluated against the criterion.
    </p>
  </div>

</div>

<!-- ════════════════════════════════════════
     PAGES 4+: WCAG 2.2 LEVEL A & AA TABLES
════════════════════════════════════════ -->
<div class="page" style="padding: 60px 50px;">
  <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 30px;">Table 1: Success Criteria, Level A</h2>

  <p style="font-size: 11px; color: #666; margin-bottom: 20px; font-style: italic;">
    When reporting on conformance with WCAG 2.2 Success Criteria, the criteria are scoped for full pages, complete processes, and accessibility-supported ways of using technology.
  </p>

  <table style="border: 1px solid #e0dbd9; width: 100%;">
    <thead>
      <tr style="background: #f9f6f5; border-bottom: 2px solid #e0dbd9;">
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 12%;">Criteria</th>
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 50%;">Description</th>
        <th style="padding: 10px 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 12%;">Conformance Level</th>
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 26%;">Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${buildDetailedTableRows('A')}
    </tbody>
  </table>

</div>

<!-- ════════════════════════════════════════
     LEVEL AA TABLE
════════════════════════════════════════ -->
<div class="page" style="padding: 60px 50px;">
  <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 30px;">Table 2: Success Criteria, Level AA</h2>

  <table style="border: 1px solid #e0dbd9; width: 100%;">
    <thead>
      <tr style="background: #f9f6f5; border-bottom: 2px solid #e0dbd9;">
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 12%;">Criteria</th>
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 50%;">Description</th>
        <th style="padding: 10px 14px; text-align: center; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 12%;">Conformance Level</th>
        <th style="padding: 10px 14px; text-align: left; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; width: 26%;">Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${buildDetailedTableRows('AA')}
    </tbody>
  </table>

</div>

<!-- ════════════════════════════════════════
     LEGAL DISCLAIMER
════════════════════════════════════════ -->
<div class="page" style="padding: 60px 50px;">
  <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 30px;">Legal Disclaimer</h2>

  <p style="font-size: 11px; color: #666; line-height: 1.8; margin-bottom: 16px;">
    This Voluntary Product Accessibility Template (VPAT) is a tool intended to facilitate communication between organizations and individuals regarding the accessibility of a product or service. It is not intended to be a legal document or a guarantee of product accessibility.
  </p>

  <p style="font-size: 11px; color: #666; line-height: 1.8; margin-bottom: 16px;">
    The information provided herein is based on self-assessment and may not reflect the complete accessibility status of the product or service. Additional accessibility issues may be discovered or acknowledged after publication of this report.
  </p>

  <p style="font-size: 11px; color: #666; line-height: 1.8;">
    This assessment was generated on ${date} using Mira, an accessibility auditing tool. For the most current information about product accessibility, please contact the organization directly.
  </p>

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




