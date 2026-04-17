import { IpcMain, dialog } from 'electron'
import { getDb } from '../../db'
import { findings } from '../../db/schema'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportedFinding {
  // Preview identity (not persisted)
  previewId: string
  issueType: 'Violation' | 'Needs review' | 'Recommendation'

  // Finding fields
  title: string
  wcagCriterion: string
  wcagCriterionName: string
  wcagLevel: string
  category: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  status: 'open' | 'needs_review'
  pageUrl: string
  pageTitle: string
  description: string
  instanceCount: number
  elements: string[]
}

export interface ParseResult {
  pageTitle: string
  pageUrl: string
  findings: ImportedFinding[]
  skipped: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCriterionId(checkpoint: string): string {
  // "1.4.3 Contrast (Minimum)" → "1.4.3"
  const match = checkpoint.trim().match(/^(\d+\.\d+\.\d+)/)
  return match ? match[1] : checkpoint.trim()
}

function extractCriterionName(checkpoint: string): string {
  // "1.4.3 Contrast (Minimum)" → "Contrast (Minimum)"
  return checkpoint.trim().replace(/^\d+\.\d+\.\d+\s*/, '').trim()
}

function getCategoryFromCriterion(criterionId: string): string {
  const major = parseInt(criterionId.split('.')[0] ?? '4', 10)
  switch (major) {
    case 1: return 'perception'
    case 2: return 'action'
    case 3: return 'cognition'
    default: return 'interaction'
  }
}

function mapSeverity(
  toolkitLevel: number | string,
  issueType: string
): 'critical' | 'serious' | 'moderate' | 'minor' {
  if (issueType === 'Recommendation') return 'minor'
  const level = typeof toolkitLevel === 'number' ? toolkitLevel : parseInt(String(toolkitLevel), 10)
  if (level === 1) return 'critical'
  if (level === 2) return 'serious'
  return 'moderate'
}

function mapStatus(issueType: string): 'open' | 'needs_review' {
  return issueType === 'Needs review' ? 'needs_review' : 'open'
}

function buildDescription(
  criterionId: string,
  criterionName: string,
  instances: Array<{ element: string; issue: string }>,
  pageTitle: string
): string {
  const count = instances.length
  const uniqueElements = [...new Set(instances.map((i) => i.element).filter(Boolean))]

  const lines: string[] = []
  lines.push(
    `${count} instance${count !== 1 ? 's' : ''} of ${criterionId} (${criterionName}) detected on ${pageTitle}.`
  )

  if (uniqueElements.length > 0) {
    lines.push(`\nAffected elements: ${uniqueElements.join(', ')}`)
  }

  lines.push('\nInstances:')
  const shown = instances.slice(0, 10)
  for (const inst of shown) {
    const issueText = (inst.issue ?? '').substring(0, 120)
    lines.push(`• ${inst.element || 'unknown'} — ${issueText}`)
  }
  if (instances.length > 10) {
    lines.push(`...and ${instances.length - 10} more instance${instances.length - 10 !== 1 ? 's' : ''}.`)
  }

  return lines.join('\n')
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseIBMReport(filePath: string): ParseResult {
  const workbook = XLSX.readFile(filePath)

  if (!workbook.SheetNames.includes('Issues')) {
    throw new Error('No "Issues" tab found. Make sure this is an IBM Equal Access report.')
  }

  const sheet = workbook.Sheets['Issues']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  if (rows.length === 0) {
    return { pageTitle: '', pageUrl: '', findings: [], skipped: 0 }
  }

  // Page info from first row
  const firstRow = rows[0]
  const pageTitle = String(firstRow['Page title'] ?? firstRow['Page Title'] ?? '')
  const pageUrl = String(firstRow['Page URL'] ?? firstRow['Page url'] ?? '')

  // Group instances by criterion ID + issueType
  // Key: `{criterionId}|||{issueType}`
  const groups = new Map<
    string,
    {
      criterionId: string
      criterionName: string
      wcagLevel: string
      issueType: string
      toolkitLevel: number
      instances: Array<{ element: string; issue: string }>
    }
  >()

  let skipped = 0

  for (const row of rows) {
    const checkpointRaw = String(row['Checkpoint'] ?? '')
    const issueType = String(row['Issue type'] ?? row['Issue Type'] ?? '')
    const toolkitLevel = Number(row['Toolkit level'] ?? row['Toolkit Level'] ?? 2)
    const wcagLevel = String(row['WCAG level'] ?? row['WCAG Level'] ?? 'AA')
    const element = String(row['Element'] ?? '')
    const issue = String(row['Issue'] ?? '')

    if (!checkpointRaw || !issueType) { skipped++; continue }

    // Split compound checkpoints: "2.4.4 Link Purpose; 4.1.2 Name, Role, Value"
    const checkpoints = checkpointRaw.split(';').map((s) => s.trim()).filter(Boolean)

    for (const checkpoint of checkpoints) {
      const criterionId = extractCriterionId(checkpoint)
      const criterionName = extractCriterionName(checkpoint)
      const groupKey = `${criterionId}|||${issueType}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          criterionId,
          criterionName,
          wcagLevel,
          issueType,
          toolkitLevel,
          instances: []
        })
      }
      groups.get(groupKey)!.instances.push({ element, issue })
    }
  }

  const result: ImportedFinding[] = []

  for (const [, group] of groups) {
    const { criterionId, criterionName, wcagLevel, issueType, toolkitLevel, instances } = group
    const count = instances.length
    const uniqueElements = [...new Set(instances.map((i) => i.element).filter(Boolean))]
    const severity = mapSeverity(toolkitLevel, issueType)
    const status = mapStatus(issueType)

    const title = `${criterionId}: ${criterionName} (${count} instance${count !== 1 ? 's' : ''})`
    const description = buildDescription(criterionId, criterionName, instances, pageTitle)

    result.push({
      previewId: randomUUID(),
      issueType: issueType as ImportedFinding['issueType'],
      title,
      wcagCriterion: criterionId,
      wcagCriterionName: criterionName,
      wcagLevel,
      category: getCategoryFromCriterion(criterionId),
      severity,
      status,
      pageUrl,
      pageTitle,
      description,
      instanceCount: count,
      elements: uniqueElements
    })
  }

  // Sort: Violations first, then Needs review, then Recommendations; within each by criterion ID
  const typeOrder: Record<string, number> = { 'Violation': 0, 'Needs review': 1, 'Recommendation': 2 }
  result.sort((a, b) => {
    const typeSort = (typeOrder[a.issueType] ?? 3) - (typeOrder[b.issueType] ?? 3)
    if (typeSort !== 0) return typeSort
    return a.wcagCriterion.localeCompare(b.wcagCriterion)
  })

  return { pageTitle, pageUrl, findings: result, skipped }
}

// ─── IPC Registration ─────────────────────────────────────────────────────────

export function registerImportHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('import:chooseFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import IBM Accessibility Report',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('import:parseFile', async (_, filePath: string) => {
    return parseIBMReport(filePath)
  })

  ipcMain.handle(
    'import:importFindings',
    async (_, projectId: string, selected: ImportedFinding[]) => {
      const db = getDb()
      const now = Date.now()

      for (const f of selected) {
        const id = randomUUID()
        await db.insert(findings).values({
          id,
          projectId,
          title: f.title,
          description: f.description,
          wcagCriterion: f.wcagCriterion || null,
          wcagLevel: f.wcagLevel || null,
          standards: JSON.stringify(['WCAG 2.1']),
          category: f.category || null,
          severity: f.severity,
          status: f.status,
          pageUrl: f.pageUrl || null,
          component: null,
          screenshotPath: null,
          recommendations: null,
          notes: `Imported from IBM Equal Access scan. ${f.instanceCount} instance${f.instanceCount !== 1 ? 's' : ''} detected.`,
          createdAt: now,
          updatedAt: now
        })
      }

      return { imported: selected.length }
    }
  )
}
