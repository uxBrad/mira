import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { WCAG_CRITERIA } from '../../lib/utils'
import type { CriterionStatus } from '../../components/audit/StepAuditPanel'

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
  const [project, setProject] = useState<Project | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set())

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  // Read criterion statuses from localStorage
  const storageKey = `echo-step-audit-${id}`
  let criteriaStatus: Record<string, CriterionStatus> = {}
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)?.criteriaStatus
      if (parsed && typeof parsed === 'object') criteriaStatus = parsed
    }
  } catch { /* ignore */ }

  const wcagCriteria = WCAG_CRITERIA as unknown as Criterion[]

  // Derive effective status for each criterion
  function getEffectiveStatus(c: Criterion): CriterionStatus {
    const criterionFindings = findings.filter((f) => f.wcagCriterion === c.id)
    const hasFail = criterionFindings.some((f) => f.status !== 'resolved')
    return hasFail ? 'failed' : (criteriaStatus[c.id] ?? 'in_progress')
  }

  // Summary counts
  const counts = wcagCriteria.reduce(
    (acc, c) => {
      const s = getEffectiveStatus(c)
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const total = wcagCriteria.length
  const reviewed = (counts.passed ?? 0) + (counts.failed ?? 0) + (counts.complete ?? 0)
  const passRate = reviewed > 0
    ? Math.round(((counts.passed ?? 0) / reviewed) * 100)
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

  const statusConfig: Record<CriterionStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    passed: { label: 'Passed', bg: '#2d7a4f', text: '#fff', icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { label: 'Failed', bg: '#610000', text: '#fff', icon: <AlertCircle className="h-3 w-3" /> },
    complete: { label: 'Complete', bg: '#2b2c2c', text: '#fff', icon: <Check className="h-3 w-3" /> },
    in_progress: { label: 'In Progress', bg: '#e5e2e1', text: '#5f5e5e', icon: <Clock className="h-3 w-3" /> },
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#fcf9f8' }}>
      {/* Page header */}
      <div className="flex-shrink-0 px-10 pt-8 pb-6" style={{ borderBottom: '1px solid #e0dbd9', background: '#fcf9f8' }}>
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="font-sans text-xs font-bold uppercase tracking-widest mb-4 inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ color: '#610000', letterSpacing: '0.12em' }}
        >
          ← Back to Project
        </button>

        <div className="flex items-end justify-between gap-8">
          <div>
            {project.standards && (
              <p className="font-sans text-xs font-bold uppercase mb-2" style={{ color: '#610000', letterSpacing: '0.12em' }}>
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

          {/* Summary stats */}
          <div className="flex items-stretch gap-0 flex-shrink-0" style={{ border: '1px solid #e0dbd9', borderRadius: '6px', overflow: 'hidden' }}>
            {[
              { label: 'Total', value: total, color: '#1a1a1a' },
              { label: 'Passed', value: counts.passed ?? 0, color: '#2d7a4f' },
              { label: 'Failed', value: counts.failed ?? 0, color: '#610000' },
              { label: 'Complete', value: counts.complete ?? 0, color: '#2b2c2c' },
              { label: 'In Progress', value: counts.in_progress ?? total, color: '#8b6914' },
              { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? '#2d7a4f' : passRate >= 50 ? '#8b6914' : '#610000' },
            ].map(({ label, value, color }, i) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center px-5 py-3"
                style={{
                  background: '#fff',
                  borderLeft: i > 0 ? '1px solid #e0dbd9' : 'none',
                  minWidth: '72px',
                }}
              >
                <span className="font-serif font-bold" style={{ fontSize: '1.6rem', color, lineHeight: 1 }}>{value}</span>
                <span className="font-sans text-xs mt-1 whitespace-nowrap" style={{ color: '#5f5e5e' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-2" style={{ background: '#e0dbd9', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ width: `${((counts.passed ?? 0) / total) * 100}%`, background: '#2d7a4f', transition: 'width 0.3s' }} />
              <div style={{ width: `${((counts.failed ?? 0) / total) * 100}%`, background: '#610000', transition: 'width 0.3s' }} />
              <div style={{ width: `${((counts.complete ?? 0) / total) * 100}%`, background: '#2b2c2c', transition: 'width 0.3s' }} />
            </div>
          </div>
          <span className="font-sans text-xs flex-shrink-0" style={{ color: '#5f5e5e' }}>
            {reviewed} of {total} criteria reviewed
          </span>
        </div>
      </div>

      {/* Criteria list */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {categories.map((cat) => {
          const items = groupedByCategory[cat] ?? []
          const catCounts = items.reduce((acc, c) => {
            const s = getEffectiveStatus(c)
            acc[s] = (acc[s] ?? 0) + 1
            return acc
          }, {} as Record<string, number>)

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
                  {(['passed', 'failed', 'complete', 'in_progress'] as CriterionStatus[]).map((s) =>
                    catCounts[s] ? (
                      <span
                        key={s}
                        className="font-sans text-xs font-bold px-2 py-0.5"
                        style={{ background: statusConfig[s].bg, color: statusConfig[s].text, borderRadius: '3px' }}
                      >
                        {catCounts[s]} {statusConfig[s].label}
                      </span>
                    ) : null
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {items.map((c) => {
                  const effectiveStatus = getEffectiveStatus(c)
                  const { label, bg, text, icon } = statusConfig[effectiveStatus]
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
                          <span className="font-sans text-xs font-bold flex-shrink-0" style={{ color: '#610000', minWidth: '2.8rem' }}>{c.id}</span>
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
                        <span
                          className="flex-shrink-0 flex items-center gap-1 font-sans text-xs font-bold uppercase px-2.5 py-1"
                          style={{ background: bg, color: text, letterSpacing: '0.08em', borderRadius: '3px', whiteSpace: 'nowrap' }}
                        >
                          {icon}
                          {label}
                        </span>
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
                                  background: f.status === 'resolved' ? '#2d7a4f' : f.status === 'needs_review' ? '#8b6914' : '#610000',
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
    </div>
  )
}
