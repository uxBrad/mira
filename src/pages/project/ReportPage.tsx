import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, Check, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { WCAG_CRITERIA } from '../../lib/utils'
import type { CriterionVerdict, CriterionProgress } from '../../components/audit/StepAuditPanel'
import { useToast } from '../../components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../components/ui/dialog'

interface Project {
  id: string
  name: string
  clientName: string | null
  url: string | null
  standards: string | null
  status: string
}

interface Finding {
  id: string
  title: string
  wcagCriterion: string | null
  severity: string | null
  status: string | null
  pageUrl: string | null
  component: string | null
  description: string | null
}

type Criterion = { id: string; name: string; level: string; category: string }

const CATEGORY_LABELS: Record<string, string> = {
  perception: 'Perceivable',
  action: 'Operable',
  cognition: 'Understandable',
  interaction: 'Robust',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#c0392b',
  serious: '#c0392b',
  moderate: '#8b6914',
  minor: '#2d7a4f',
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set())
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [showFormatDialog, setShowFormatDialog] = useState(false)

  // Debug: log component load
  console.log('[ReportPage] Component rendered, showFormatDialog:', showFormatDialog)

  useEffect(() => {
    if (!id) return
    Promise.all([
      window.api.projects.get(id),
      window.api.findings.list(id),
    ])
      .then(([p, f]) => {
        setProject(p as Project)
        setFindings(f as Finding[])
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setIsLoading(false))
  }, [id, navigate])

  const handleExportPdf = async (format: 'summary' | 'vpat') => {
    if (!id) return
    setIsExportingPdf(true)
    setShowFormatDialog(false)
    try {
      // Read audit state from localStorage to pass to export handler
      const auditKey = `echo-step-audit-${id}`
      const raw = JSON.parse(localStorage.getItem(auditKey) || '{}')
      const auditState = {
        criteriaVerdict: raw.criteriaVerdict || {},
        criteriaProgress: raw.criteriaProgress || {},
        criterionNotes: raw.criterionNotes || {}
      }
      const result = await window.api.export.pdf(id, format, auditState)
      if (result.canceled) {
        return
      }

      // Show toast with clickable file path
      const handleOpenFile = async () => {
        try {
          await window.api.system.openFile(result.path!)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to open file'
          toast({ variant: 'destructive', title: 'Error', description: message })
        }
      }

      toast({
        title: 'PDF exported',
        description: (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">{format === 'vpat' ? 'VPAT' : 'Summary'} report saved</span>
            <button
              onClick={handleOpenFile}
              className="text-xs font-semibold text-primary hover:text-primary/80 underline transition-colors flex-shrink-0"
              type="button"
            >
              Open File
            </button>
          </div>
        )
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export PDF'
      toast({ variant: 'destructive', title: 'Export failed', description: message })
      console.error('PDF export error:', error)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleClickExportPdf = () => {
    console.log('[Export] PDF button clicked, opening format dialog')
    console.log('[Export] Current showFormatDialog:', showFormatDialog)
    setShowFormatDialog(true)
    console.log('[Export] Set showFormatDialog to true')
  }

  const handleExportCsv = async () => {
    if (!id) return
    setIsExportingCsv(true)
    try {
      const result = await window.api.export.csv(id)
      if (result.canceled) {
        // User canceled the save dialog
        return
      }

      // Show toast with clickable file path
      const handleOpenFile = async () => {
        try {
          await window.api.system.openFile(result.path!)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to open file'
          toast({ variant: 'destructive', title: 'Error', description: message })
        }
      }

      toast({
        title: 'CSV exported',
        description: (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">CSV report saved</span>
            <button
              onClick={handleOpenFile}
              className="text-xs font-semibold text-primary hover:text-primary/80 underline transition-colors flex-shrink-0"
              type="button"
            >
              Open File
            </button>
          </div>
        )
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV'
      toast({ variant: 'destructive', title: 'Export failed', description: message })
      console.error('CSV export error:', error)
    } finally {
      setIsExportingCsv(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  // Read two-dimensional criterion statuses from localStorage
  const storageKey = `echo-step-audit-${id}`
  let criteriaVerdict: Record<string, CriterionVerdict> = {}
  let criteriaProgress: Record<string, CriterionProgress> = {}
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed?.criteriaVerdict && typeof parsed.criteriaVerdict === 'object') criteriaVerdict = parsed.criteriaVerdict
      if (parsed?.criteriaProgress && typeof parsed.criteriaProgress === 'object') criteriaProgress = parsed.criteriaProgress
    }
  } catch { /* ignore */ }

  const wcagCriteria = WCAG_CRITERIA as unknown as Criterion[]

  function getVerdict(c: Criterion): CriterionVerdict {
    const criterionFindings = findings.filter((f) => f.wcagCriterion === c.id)
    const hasFail = criterionFindings.some((f) => f.status !== 'resolved')
    return hasFail ? 'fail' : (criteriaVerdict[c.id] ?? null)
  }

  function getProgress(c: Criterion): CriterionProgress {
    return criteriaProgress[c.id] ?? 'in_progress'
  }

  // Summary counts — verdict dimension
  const verdictCounts = wcagCriteria.reduce((acc, c) => {
    const v = getVerdict(c)
    if (v) acc[v] = (acc[v] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Summary counts — progress dimension
  const progressCounts = wcagCriteria.reduce((acc, c) => {
    const p = getProgress(c)
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = wcagCriteria.length
  const withVerdict = (verdictCounts.pass ?? 0) + (verdictCounts.fail ?? 0)
  const passRate = withVerdict > 0
    ? Math.round(((verdictCounts.pass ?? 0) / withVerdict) * 100)
    : 0

  // Group by category
  const categories = ['perception', 'action', 'cognition', 'interaction']
  const groupedByCategory = categories.reduce<Record<string, Criterion[]>>((acc, cat) => {
    acc[cat] = wcagCriteria.filter((c) => c.category === cat)
    return acc
  }, {})

  function toggleExpand(criterionId: string) {
    setExpandedCriteria((prev) => {
      const next = new Set(prev)
      if (next.has(criterionId)) next.delete(criterionId)
      else next.add(criterionId)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#fcf9f8' }}>
      {/* Page header */}
      <div className="flex-shrink-0 px-10 pt-8 pb-6" style={{ borderBottom: '1px solid #e0dbd9', background: '#fcf9f8' }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(`/project/${id}`)}
            className="font-sans text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}
          >
            ← Back to Project
          </button>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClickExportPdf}
              disabled={isExportingPdf || isExportingCsv}
              className="font-sans text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 px-3 py-2 rounded hover:opacity-70 transition-opacity disabled:opacity-50"
              style={{ color: '#fff', background: '#1d4ed8', letterSpacing: '0.12em' }}
            >
              <Download size={14} />
              {isExportingPdf ? 'Exporting...' : 'PDF'}
            </button>
            <button
              onClick={handleExportCsv}
              disabled={isExportingPdf || isExportingCsv}
              className="font-sans text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 px-3 py-2 rounded hover:opacity-70 transition-opacity disabled:opacity-50"
              style={{ color: '#fff', background: '#1d4ed8', letterSpacing: '0.12em' }}
            >
              <Download size={14} />
              {isExportingCsv ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-8">
          <div>
            {project.standards && (
              <p className="font-sans text-xs font-bold uppercase mb-2" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>
                {project.standards} Audit Report
              </p>
            )}
            <h1 className="font-serif font-bold leading-none mb-1" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              {project.name}
            </h1>
            {project.clientName && (
              <p className="font-sans text-sm mt-1" style={{ color: '#5f5e5e' }}>{project.clientName}</p>
            )}
          </div>

          {/* Summary stats — two sections: verdict + progress */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Verdict stats */}
            <div className="flex items-stretch gap-0" style={{ border: '1px solid #e0dbd9', borderRadius: '6px', overflow: 'hidden' }}>
              {[
                { label: 'Total', value: total, color: '#1a1a1a' },
                { label: 'Pass', value: verdictCounts.pass ?? 0, color: '#2d7a4f' },
                { label: 'Fail', value: verdictCounts.fail ?? 0, color: '#dc2626' },
                { label: 'No Verdict', value: total - withVerdict, color: '#5f5e5e' },
                { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#2d7a4f' : passRate >= 50 ? '#8b6914' : '#dc2626' },
              ].map(({ label, value, color }, i) => (
                <div key={label} className="flex flex-col items-center justify-center px-4 py-2.5"
                  style={{ background: '#fff', borderLeft: i > 0 ? '1px solid #e0dbd9' : 'none', minWidth: '66px' }}>
                  <span className="font-serif font-bold" style={{ fontSize: '1.4rem', color, lineHeight: 1 }}>{value}</span>
                  <span className="font-sans text-xs mt-0.5 whitespace-nowrap" style={{ color: '#5f5e5e' }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Progress stats */}
            <div className="flex items-stretch gap-0" style={{ border: '1px solid #e0dbd9', borderRadius: '6px', overflow: 'hidden' }}>
              {[
                { label: 'Complete', value: progressCounts.complete ?? 0, color: '#2b2c2c' },
                { label: 'In Progress', value: progressCounts.in_progress ?? total, color: '#8b6914' },
              ].map(({ label, value, color }, i) => (
                <div key={label} className="flex flex-col items-center justify-center px-4 py-2.5"
                  style={{ background: '#fff', borderLeft: i > 0 ? '1px solid #e0dbd9' : 'none', minWidth: '80px' }}>
                  <span className="font-serif font-bold" style={{ fontSize: '1.4rem', color, lineHeight: 1 }}>{value}</span>
                  <span className="font-sans text-xs mt-0.5 whitespace-nowrap" style={{ color: '#5f5e5e' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bars — verdict (top) and completion (bottom) */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-sans text-xs w-20 flex-shrink-0" style={{ color: '#5f5e5e' }}>Verdict</span>
            <div className="flex-1 h-2" style={{ background: '#e0dbd9', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ width: `${((verdictCounts.pass ?? 0) / total) * 100}%`, background: '#2d7a4f', transition: 'width 0.3s' }} />
                <div style={{ width: `${((verdictCounts.fail ?? 0) / total) * 100}%`, background: '#dc2626', transition: 'width 0.3s' }} />
              </div>
            </div>
            <span className="font-sans text-xs flex-shrink-0 w-24 text-right" style={{ color: '#5f5e5e' }}>
              {withVerdict} of {total} criteria
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-sans text-xs w-20 flex-shrink-0" style={{ color: '#5f5e5e' }}>Progress</span>
            <div className="flex-1 h-2" style={{ background: '#e0dbd9', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${((progressCounts.complete ?? 0) / total) * 100}%`, background: '#2b2c2c', transition: 'width 0.3s', height: '100%' }} />
            </div>
            <span className="font-sans text-xs flex-shrink-0 w-24 text-right" style={{ color: '#5f5e5e' }}>
              {progressCounts.complete ?? 0} complete
            </span>
          </div>
        </div>
      </div>

      {/* Criteria list */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {categories.map((cat) => {
          const items = groupedByCategory[cat] ?? []
          const catVerdicts = items.reduce((acc, c) => { const v = getVerdict(c); if (v) acc[v] = (acc[v] ?? 0) + 1; return acc }, {} as Record<string, number>)
          const catComplete = items.filter(c => getProgress(c) === 'complete').length

          return (
            <div key={cat} className="mb-10">
              {/* Category header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif font-bold text-xl" style={{ color: '#1a1a1a' }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h2>
                  <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>{items.length} criteria</span>
                </div>
                <div className="flex items-center gap-2">
                  {catVerdicts.pass ? <span className="font-sans text-xs font-bold px-2 py-0.5" style={{ background: '#2d7a4f', color: '#fff', borderRadius: '3px' }}>{catVerdicts.pass} Pass</span> : null}
                  {catVerdicts.fail ? <span className="font-sans text-xs font-bold px-2 py-0.5" style={{ background: '#dc2626', color: '#fff', borderRadius: '3px' }}>{catVerdicts.fail} Fail</span> : null}
                  {catComplete > 0 ? <span className="font-sans text-xs font-bold px-2 py-0.5" style={{ background: '#2b2c2c', color: '#fff', borderRadius: '3px' }}>{catComplete} Complete</span> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                {items.map((c) => {
                  const v = getVerdict(c)
                  const p = getProgress(c)
                  const criterionFindings = findings.filter((f) => f.wcagCriterion === c.id)
                  const isExpanded = expandedCriteria.has(c.id)
                  const hasFindings = criterionFindings.length > 0

                  return (
                    <div key={c.id} style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #e0dbd9' }}>
                      {/* Criterion row */}
                      <div
                        className="flex items-center justify-between gap-4 px-4 py-3"
                        style={{ background: '#fff', cursor: hasFindings ? 'pointer' : 'default' }}
                        onClick={() => hasFindings && toggleExpand(c.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {hasFindings ? (
                            <span style={{ color: '#5f5e5e', flexShrink: 0 }}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          ) : (
                            <span style={{ width: '16px', flexShrink: 0 }} />
                          )}
                          <span className="font-sans text-xs font-bold flex-shrink-0" style={{ color: '#1d4ed8', minWidth: '2.8rem' }}>{c.id}</span>
                          <span className="font-sans text-sm" style={{ color: '#2b2c2c' }}>{c.name}</span>
                          <span
                            className="font-sans text-xs flex-shrink-0"
                            style={{ color: '#5f5e5e', background: '#f0ede9', padding: '1px 6px', borderRadius: '2px' }}
                          >
                            {c.level}
                          </span>
                          {hasFindings && (
                            <span className="font-sans text-xs flex-shrink-0" style={{ color: '#5f5e5e' }}>
                              {criterionFindings.length} finding{criterionFindings.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Two independent status badges */}
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {v === 'pass' && <span className="flex items-center gap-1 font-sans text-xs font-bold uppercase px-2.5 py-1" style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.08em', borderRadius: '3px' }}><CheckCircle2 className="h-3 w-3" />Pass</span>}
                          {v === 'fail' && <span className="flex items-center gap-1 font-sans text-xs font-bold uppercase px-2.5 py-1" style={{ background: '#dc2626', color: '#fff', letterSpacing: '0.08em', borderRadius: '3px' }}><AlertCircle className="h-3 w-3" />Fail</span>}
                          {!v && <span className="font-sans text-xs px-2.5 py-1" style={{ background: '#f0ede9', color: '#5f5e5e', borderRadius: '3px' }}>No Verdict</span>}
                          {p === 'complete' ? (
                            <span className="flex items-center gap-1 font-sans text-xs font-bold uppercase px-2.5 py-1" style={{ background: '#2b2c2c', color: '#fff', letterSpacing: '0.08em', borderRadius: '3px' }}><Check className="h-3 w-3" />Complete</span>
                          ) : (
                            <span className="flex items-center gap-1 font-sans text-xs font-bold uppercase px-2.5 py-1" style={{ background: '#e5e2e1', color: '#5f5e5e', letterSpacing: '0.08em', borderRadius: '3px' }}><Clock className="h-3 w-3" />In Progress</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded findings */}
                      {isExpanded && hasFindings && (
                        <div style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}>
                          {criterionFindings.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-start gap-4 px-6 py-3"
                              style={{ borderBottom: '1px solid #e0dbd9' }}
                            >
                              {/* Severity dot */}
                              <div
                                className="flex-shrink-0 mt-1 w-2 h-2 rounded-full"
                                style={{ background: SEVERITY_COLORS[f.severity ?? ''] ?? '#5f5e5e' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="font-sans text-sm font-semibold" style={{ color: '#1a1a1a' }}>{f.title}</span>
                                  {f.severity && (
                                    <span
                                      className="font-sans text-xs font-bold uppercase"
                                      style={{ color: SEVERITY_COLORS[f.severity] ?? '#5f5e5e', letterSpacing: '0.06em' }}
                                    >
                                      {f.severity}
                                    </span>
                                  )}
                                </div>
                                {f.description && (
                                  <p className="font-sans text-xs leading-relaxed" style={{ color: '#5f5e5e' }}>{f.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  {f.pageUrl && (
                                    <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>📄 {f.pageUrl}</span>
                                  )}
                                  {f.component && (
                                    <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>🧩 {f.component}</span>
                                  )}
                                </div>
                              </div>
                              {/* Finding status */}
                              <span
                                className="flex-shrink-0 font-sans text-xs font-bold uppercase px-2 py-0.5"
                                style={{
                                  background: f.status === 'resolved' ? '#2d7a4f' : f.status === 'needs_review' ? '#8b6914' : '#dc2626',
                                  color: '#fff',
                                  letterSpacing: '0.06em',
                                  borderRadius: '3px',
                                }}
                              >
                                {f.status === 'resolved' ? 'Resolved' : f.status === 'needs_review' ? 'Needs Review' : 'Open'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Format selection dialog */}
      <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Report Format</DialogTitle>
            <DialogDescription>
              Select the format for your accessibility report export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleExportPdf('summary')}
              disabled={isExportingPdf}
              className="w-full flex flex-col items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
              style={{ borderColor: '#e0dbd9' }}
            >
              <span className="font-semibold" style={{ color: '#1d4ed8' }}>Summary Report</span>
              <span className="text-xs text-gray-600 mt-1">Executive overview with findings grouped by severity</span>
            </button>
            <button
              onClick={() => handleExportPdf('vpat')}
              disabled={isExportingPdf}
              className="w-full flex flex-col items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
              style={{ borderColor: '#e0dbd9' }}
            >
              <span className="font-semibold" style={{ color: '#1d4ed8' }}>VPAT Report</span>
              <span className="text-xs text-gray-600 mt-1">Voluntary Product Accessibility Template with criterion-by-criterion assessment</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
