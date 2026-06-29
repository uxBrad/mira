import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'

// ─── Types (mirrored from electron/ipc/import.ts) ────────────────────────────

interface ImportedFinding {
  previewId: string
  issueType: 'Violation' | 'Needs review' | 'Recommendation'
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

interface ParseResult {
  pageTitle: string
  pageUrl: string
  findings: ImportedFinding[]
  skipped: number
}

interface ImportFindingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onImported: () => void
}

// ─── Severity colours ─────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  critical:  { bg: '#fde8e8', color: '#c0392b' },
  serious:   { bg: '#fdeede', color: '#a84300' },
  moderate:  { bg: '#fdf5dc', color: '#8b6914' },
  minor:     { bg: '#e8f5ee', color: '#2d7a4f' }
}

const ISSUE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  'Violation':      { bg: '#fde8e8', color: '#c0392b' },
  'Needs review':   { bg: '#fdf5dc', color: '#8b6914' },
  'Recommendation': { bg: '#e8f0fd', color: '#2c4ca8' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportFindingsDialog({
  open,
  onOpenChange,
  projectId,
  onImported
}: ImportFindingsDialogProps) {
  const [step, setStep] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle')
  const [_filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [includeViolations, setIncludeViolations] = useState(true)
  const [includeNeedsReview, setIncludeNeedsReview] = useState(true)
  const [includeRecommendations, setIncludeRecommendations] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Expanded description rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Import result
  const [importedCount, setImportedCount] = useState(0)

  function reset() {
    setStep('idle')
    setFilePath(null)
    setFileName('')
    setParsed(null)
    setError(null)
    setIsLoading(false)
    setSelectedIds(new Set())
    setExpandedIds(new Set())
    setImportedCount(0)
  }

  function handleClose(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  async function handleChooseFile() {
    setError(null)
    setIsLoading(true)
    try {
      const path = await window.api.import.chooseFile()
      if (!path) { setIsLoading(false); return }

      setFilePath(path)
      const name = path.split(/[\\/]/).pop() ?? path
      setFileName(name)

      const result = await window.api.import.parseFile(path) as ParseResult
      setParsed(result)

      // Pre-select all violations + needs review
      const preSelected = new Set(
        result.findings
          .filter(f => f.issueType === 'Violation' || f.issueType === 'Needs review')
          .map(f => f.previewId)
      )
      setSelectedIds(preSelected)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file.')
    } finally {
      setIsLoading(false)
    }
  }

  function getVisibleFindings(): ImportedFinding[] {
    if (!parsed) return []
    return parsed.findings.filter(f => {
      if (f.issueType === 'Violation' && !includeViolations) return false
      if (f.issueType === 'Needs review' && !includeNeedsReview) return false
      if (f.issueType === 'Recommendation' && !includeRecommendations) return false
      return true
    })
  }

  function toggleAll(visible: ImportedFinding[]) {
    const visibleIds = new Set(visible.map(f => f.previewId))
    const allSelected = visible.every(f => selectedIds.has(f.previewId))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (!parsed) return
    const toImport = parsed.findings.filter(f => selectedIds.has(f.previewId))
    if (toImport.length === 0) return

    setStep('importing')
    setError(null)
    try {
      const result = await window.api.import.importFindings(projectId, toImport) as { imported: number }
      setImportedCount(result.imported)
      setStep('done')
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
      setStep('preview')
    }
  }

  const visible = getVisibleFindings()
  const selectedVisible = visible.filter(f => selectedIds.has(f.previewId))
  const allVisibleSelected = visible.length > 0 && visible.every(f => selectedIds.has(f.previewId))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex flex-col"
        style={{ maxWidth: '780px', width: '90vw', maxHeight: '88vh', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <DialogHeader style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <DialogTitle className="font-serif font-bold text-xl" style={{ color: '#1a1a1a' }}>
            Import from IBM Equal Access
          </DialogTitle>
          <DialogDescription className="font-sans text-sm" style={{ color: '#5f5e5e' }}>
            Import findings from an IBM Equal Access Checker Excel report. Instances of the same
            WCAG criterion are grouped into a single finding.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 28px' }}>

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#f6f3f2', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileSpreadsheet className="h-6 w-6" style={{ color: '#1d4ed8' }} />
              </div>
              <div className="text-center">
                <p className="font-sans font-semibold text-sm" style={{ color: '#1a1a1a' }}>
                  Select an IBM Equal Access report
                </p>
                <p className="font-sans text-xs mt-1" style={{ color: '#5f5e5e' }}>
                  Export the report from the IBM Equal Access Chrome extension as Excel (.xlsx)
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#c0392b' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <Button
                onClick={handleChooseFile}
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Reading file…' : 'Choose file'}
              </Button>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && parsed && (
            <div className="flex flex-col gap-4">
              {/* File info */}
              <div style={{ background: '#f6f3f2', borderRadius: '4px', padding: '10px 14px' }}>
                <p className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em' }}>
                  File
                </p>
                <p className="font-sans text-sm font-semibold mt-0.5" style={{ color: '#1a1a1a' }}>{fileName}</p>
                {parsed.pageTitle && (
                  <p className="font-sans text-xs mt-0.5" style={{ color: '#5f5e5e' }}>
                    {parsed.pageTitle}
                  </p>
                )}
                {parsed.pageUrl && (
                  <p className="font-sans text-xs" style={{ color: '#8b6914' }}>{parsed.pageUrl}</p>
                )}
                {parsed.skipped > 0 && (
                  <p className="font-sans text-xs mt-1" style={{ color: '#5f5e5e' }}>
                    {parsed.skipped} rows skipped (missing checkpoint or issue type)
                  </p>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em' }}>
                  Include
                </span>
                {([
                  { key: 'Violation', label: 'Violations', val: includeViolations, set: setIncludeViolations },
                  { key: 'Needs review', label: 'Needs Review', val: includeNeedsReview, set: setIncludeNeedsReview },
                  { key: 'Recommendation', label: 'Recommendations', val: includeRecommendations, set: setIncludeRecommendations }
                ] as const).map(({ label, val, set, key }) => {
                  const count = parsed.findings.filter(f => f.issueType === key).length
                  return (
                    <label
                      key={label}
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                      style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#2b2c2c' }}
                    >
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={e => set(e.target.checked)}
                        style={{ accentColor: '#1d4ed8', width: 14, height: 14 }}
                      />
                      {label}
                      <span style={{ color: '#5f5e5e', fontSize: '11px' }}>({count})</span>
                    </label>
                  )
                })}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#c0392b' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Empty state */}
              {visible.length === 0 && (
                <p className="font-sans text-sm text-center py-8" style={{ color: '#5f5e5e' }}>
                  No findings match the selected filters.
                </p>
              )}

              {/* Preview table */}
              {visible.length > 0 && (
                <div style={{ border: '1px solid #e0dbd9', borderRadius: '4px', overflow: 'hidden' }}>
                  {/* Table header */}
                  <div
                    className="flex items-center gap-3 px-3 py-2"
                    style={{ background: '#f6f3f2', borderBottom: '1px solid #e0dbd9' }}
                  >
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => toggleAll(visible)}
                      style={{ accentColor: '#1d4ed8', width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em', flex: 1 }}>
                      Finding ({selectedVisible.length} of {visible.length} selected)
                    </span>
                    <span className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em', width: 70, textAlign: 'center' }}>
                      Type
                    </span>
                    <span className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em', width: 72, textAlign: 'center' }}>
                      Severity
                    </span>
                    <span className="font-sans text-xs font-bold uppercase" style={{ color: '#5f5e5e', letterSpacing: '0.08em', width: 28 }} />
                  </div>

                  {/* Rows */}
                  {visible.map((f) => {
                    const isSelected = selectedIds.has(f.previewId)
                    const isExpanded = expandedIds.has(f.previewId)
                    const sevStyle = SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.moderate
                    const typeStyle = ISSUE_TYPE_STYLE[f.issueType] ?? ISSUE_TYPE_STYLE['Violation']

                    return (
                      <div
                        key={f.previewId}
                        style={{ borderBottom: '1px solid #e0dbd9' }}
                      >
                        <div
                          className="flex items-center gap-3 px-3 py-2.5"
                          style={{ background: isSelected ? '#fff' : '#fafafa' }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(f.previewId)}
                            style={{ accentColor: '#1d4ed8', width: 14, height: 14, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-sans text-xs font-bold flex-shrink-0"
                                style={{ color: '#1d4ed8' }}
                              >
                                {f.wcagCriterion}
                              </span>
                              <span className="font-sans text-sm" style={{ color: '#1a1a1a' }}>
                                {f.wcagCriterionName}
                              </span>
                              <span
                                className="font-sans text-xs flex-shrink-0"
                                style={{ color: '#5f5e5e', background: '#f0ede9', padding: '1px 5px', borderRadius: '2px' }}
                              >
                                {f.wcagLevel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
                                {f.instanceCount} instance{f.instanceCount !== 1 ? 's' : ''}
                              </span>
                              {f.elements.length > 0 && (
                                <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
                                  · {f.elements.slice(0, 4).join(', ')}{f.elements.length > 4 ? ` +${f.elements.length - 4}` : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Issue type badge */}
                          <span
                            className="font-sans text-xs font-bold flex-shrink-0"
                            style={{
                              background: typeStyle.bg,
                              color: typeStyle.color,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              width: 70,
                              textAlign: 'center',
                              fontSize: '10px',
                              letterSpacing: '0.04em'
                            }}
                          >
                            {f.issueType === 'Needs review' ? 'Review' : f.issueType}
                          </span>

                          {/* Severity badge */}
                          <span
                            className="font-sans text-xs font-bold uppercase flex-shrink-0"
                            style={{
                              background: sevStyle.bg,
                              color: sevStyle.color,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              width: 72,
                              textAlign: 'center',
                              fontSize: '10px',
                              letterSpacing: '0.06em'
                            }}
                          >
                            {f.severity}
                          </span>

                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleExpand(f.previewId)}
                            style={{ color: '#5f5e5e', flexShrink: 0, width: 28, display: 'flex', justifyContent: 'center' }}
                            title={isExpanded ? 'Hide details' : 'Show details'}
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>

                        {/* Expanded description */}
                        {isExpanded && (
                          <div
                            className="px-10 py-3"
                            style={{ background: '#f6f3f2', borderTop: '1px solid #e0dbd9' }}
                          >
                            <p
                              className="font-sans text-xs leading-relaxed whitespace-pre-line"
                              style={{ color: '#2b2c2c' }}
                            >
                              {f.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#1d4ed8', borderTopColor: 'transparent' }} />
              <p className="font-sans text-sm" style={{ color: '#5f5e5e' }}>Importing findings…</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: '#2d7a4f' }} />
              </div>
              <div className="text-center">
                <p className="font-sans font-bold text-base" style={{ color: '#1a1a1a' }}>
                  {importedCount} finding{importedCount !== 1 ? 's' : ''} imported
                </p>
                <p className="font-sans text-sm mt-1" style={{ color: '#5f5e5e' }}>
                  They've been added to your project's finding list.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                >
                  Import another file
                </Button>
                <Button
                  onClick={() => handleClose(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <DialogFooter style={{ padding: '16px 28px', borderTop: '1px solid #e0dbd9', flexShrink: 0 }}>
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                variant="outline"
                onClick={() => { reset(); setStep('idle') }}
              >
                Choose different file
              </Button>
              <div className="flex items-center gap-3">
                <span className="font-sans text-sm" style={{ color: '#5f5e5e' }}>
                  {selectedVisible.length} finding{selectedVisible.length !== 1 ? 's' : ''} to import
                </span>
                <Button
                  onClick={handleImport}
                  disabled={selectedVisible.length === 0}
                >
                  Import {selectedVisible.length > 0 ? selectedVisible.length : ''} finding{selectedVisible.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
