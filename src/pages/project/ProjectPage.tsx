import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Download,
  ExternalLink,
  AlertCircle,
  Eye,
  MousePointer,
  BookOpen,
  Shield,
  LayoutGrid,
  Settings2,
  ListChecks
} from 'lucide-react'
import { useFindings } from '../../hooks/useFindings'
import { useTemplates } from '../../hooks/useTemplates'
import { FindingTable } from '../../components/findings/FindingTable'
import { FindingFormSidebar } from '../../components/findings/FindingFormSidebar'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  archived: 'Archived'
}

const SEVERITY_FILTERS = [
  { key: 'all', label: 'All severities' },
  { key: 'critical', label: 'Critical' },
  { key: 'serious', label: 'Serious' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'minor', label: 'Minor' }
]

const STATUS_FILTERS = [
  { key: 'all', label: 'All statuses' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'wont_fix', label: "Won't Fix" }
]

interface Project {
  id: string
  name: string
  clientName: string | null
  url: string | null
  description: string | null
  status: string
  standards: string | null
  auditUrls: string[]
  components: string[]
  createdAt: number
  updatedAt: number
}

interface Finding {
  id: string
  projectId: string
  title: string
  description: string | null
  wcagCriterion: string | null
  wcagLevel: string | null
  standards: string[]
  category: string | null
  severity: string | null
  status: string | null
  pageUrl: string | null
  component: string | null
  screenshotPath: string | null
  recommendations: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFinding, setEditFinding] = useState<Finding | null>(null)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)
  const [principleFilter, setPrincipleFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [pageFilter, setPageFilter] = useState<string[]>([])
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [findingInitialData, setFindingInitialData] = useState<Partial<Finding> | undefined>(undefined)

  // Modal add page / component
  const [pageModalOpen, setPageModalOpen] = useState(false)
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [newPageValue, setNewPageValue] = useState('')
  const [newComponentValue, setNewComponentValue] = useState('')

  const { findings, isLoading, error, createFinding, updateFinding, deleteFinding } = useFindings(id!)
  const { templates } = useTemplates()

  useEffect(() => {
    if (!id) return
    window.api.projects
      .get(id)
      .then((p) => setProject(p as Project))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setIsLoadingProject(false))
  }, [id, navigate])


  // Derived filter options from findings
  const uniquePages = Array.from(
    new Set(findings.map((f) => f.pageUrl).filter((p): p is string => !!p))
  )
  const uniqueComponents = Array.from(
    new Set(findings.map((f) => f.component).filter((c): c is string => !!c))
  )

  const filtered = findings.filter((f) => {
    if (principleFilter !== 'all') {
      const prefix = f.wcagCriterion?.split('.')[0]
      if (prefix !== principleFilter) return false
    }
    if (severityFilter.length > 0 && !severityFilter.includes(f.severity ?? '')) return false
    if (statusFilter.length > 0 && !statusFilter.includes(f.status ?? '')) return false
    if (pageFilter.length > 0 && !pageFilter.includes(f.pageUrl ?? '')) return false
    if (componentFilter.length > 0 && !componentFilter.includes(f.component ?? '')) return false
    return true
  })

  const activeFilterCount =
    (principleFilter !== 'all' ? 1 : 0) +
    severityFilter.length + statusFilter.length + pageFilter.length + componentFilter.length

  function toggleFilter(
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

  function openBlankFinding() {
    setFindingInitialData(undefined)
    setEditFinding(null)
    setCreateOpen(true)
  }

  function applyTemplate(template: typeof templates[number]) {
    setTemplatePickerOpen(false)
    setFindingInitialData({
      title: template.title,
      description: template.description ?? undefined,
      wcagCriterion: template.wcagCriterion ?? undefined,
      wcagLevel: template.wcagLevel ?? undefined,
      standards: template.standards,
      category: template.category ?? undefined,
      severity: template.severity ?? undefined,
      recommendations: template.recommendations ?? undefined,
      notes: template.notes ?? undefined
    })
    setEditFinding(null)
    setCreateOpen(true)
  }

  async function handleCreateFinding(data: Parameters<typeof createFinding>[0]) {
    await createFinding(data)
    setCreateOpen(false)
    setFindingInitialData(undefined)
    toast({ title: 'Finding added' })
  }

  async function handleEditFinding(data: Parameters<typeof createFinding>[0]) {
    if (!editFinding) return
    await updateFinding(editFinding.id, data as unknown as Record<string, unknown>)
    setEditFinding(null)
    toast({ title: 'Finding updated' })
  }

  async function handleUpdateProject(data: {
    name?: string
    clientName?: string
    url?: string
    description?: string
    status?: string
    standards?: string
    auditUrls?: string[]
    components?: string[]
  }) {
    if (!id) return
    const updated = await window.api.projects.update(id, data)
    setProject(updated as Project)
    setEditProjectOpen(false)
    toast({ title: 'Project updated' })
  }

  async function handleAddPage(page: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      auditUrls: [...project.auditUrls, page]
    })
    setProject(updated as Project)
  }

  async function handleAddComponent(component: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      components: [...project.components, component]
    })
    setProject(updated as Project)
  }

  async function confirmAddPage() {
    const trimmed = newPageValue.trim()
    if (!trimmed || !project) return
    if (!project.auditUrls.includes(trimmed)) {
      await handleAddPage(trimmed)
    }
    setPageModalOpen(false)
    setNewPageValue('')
  }

  async function confirmAddComponent() {
    const trimmed = newComponentValue.trim()
    if (!trimmed || !project) return
    if (!project.components.includes(trimmed)) {
      await handleAddComponent(trimmed)
    }
    setComponentModalOpen(false)
    setNewComponentValue('')
  }

  async function handleExportPDF() {
    setIsExporting('pdf')
    try {
      const result = await window.api.export.exportPDF(id!)
      if (!result.canceled) {
        toast({ title: 'PDF exported', description: `Saved to ${result.path}` })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not generate PDF.'
      })
    } finally {
      setIsExporting(null)
    }
  }

  async function handleExportCSV() {
    setIsExporting('csv')
    try {
      const result = await window.api.export.exportCSV(id!)
      if (!result.canceled) {
        toast({ title: 'CSV exported', description: `Saved to ${result.path}` })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not export CSV.'
      })
    } finally {
      setIsExporting(null)
    }
  }

  const sidebarOpen = createOpen || !!editFinding

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="Loading project">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  const severityCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    serious: findings.filter((f) => f.severity === 'serious').length,
    moderate: findings.filter((f) => f.severity === 'moderate').length,
    minor: findings.filter((f) => f.severity === 'minor').length
  }

  const resolvedCount = findings.filter((f) => f.status === 'resolved').length
  const complianceScore = findings.length > 0 ? Math.round((resolvedCount / findings.length) * 100) : 0

  const PRINCIPLES = [
    { key: 'all', label: 'All', icon: LayoutGrid },
    { key: '1', label: 'Perceivable', icon: Eye },
    { key: '2', label: 'Operable', icon: MousePointer },
    { key: '3', label: 'Understandable', icon: BookOpen },
    { key: '4', label: 'Robust', icon: Shield },
  ]

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Project header */}
        <div className="flex-shrink-0 px-10 pt-8 pb-0" style={{ background: '#fcf9f8' }}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 font-sans text-xs font-medium text-[#5f5e5e] hover:text-foreground mb-5 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All projects
          </button>

          {/* Standards label */}
          {project.standards && (
            <p
              className="font-sans text-xs font-bold uppercase mb-3"
              style={{ color: '#610000', letterSpacing: '0.12em' }}
            >
              {project.standards} Audit
            </p>
          )}

          {/* Project name — large serif */}
          <h1
            className="font-serif font-bold leading-none mb-1"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}
          >
            {project.name}
          </h1>

          {/* Client + URL */}
          <div className="flex items-center gap-3 mt-2 mb-5 flex-wrap">
            {project.clientName && (
              <span className="font-sans text-sm" style={{ color: '#5f5e5e' }}>{project.clientName}</span>
            )}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-sans text-xs hover:underline"
                style={{ color: '#5f5e5e' }}
              >
                {project.url}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: '#e0dbd9', marginBottom: 0 }} />

          {/* WCAG Principle tabs */}
          <div
            className="flex items-center gap-0 -mb-px overflow-x-auto"
            role="tablist"
            aria-label="Filter by WCAG principle"
            style={{ scrollbarWidth: 'none' }}
          >
            {PRINCIPLES.map(({ key, label, icon: Icon }) => {
              const active = principleFilter === key
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPrincipleFilter(key)}
                  className="flex items-center gap-1.5 px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap flex-shrink-0"
                  style={{
                    letterSpacing: '0.1em',
                    background: active ? '#610000' : 'transparent',
                    color: active ? '#ffffff' : '#5f5e5e',
                    borderBottom: active ? 'none' : '2px solid transparent',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Findings list */}
        <main id="main-findings" className="flex-1 overflow-y-auto px-10 py-6">

          {/* Secondary filters row */}
          {findings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {SEVERITY_FILTERS.filter((f) => f.key !== 'all').map((f) => {
                const active = severityFilter.includes(f.key)
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFilter(f.key, severityFilter, setSeverityFilter)}
                    aria-pressed={active}
                    className="font-sans text-xs font-semibold px-2.5 py-1 transition-colors"
                    style={{
                      letterSpacing: '0.06em',
                      background: active ? '#2b2c2c' : '#f0ede9',
                      color: active ? '#ffffff' : '#5f5e5e',
                    }}
                  >
                    {f.label}
                    <span className="ml-1 opacity-60">
                      ({severityCounts[f.key as keyof typeof severityCounts] ?? 0})
                    </span>
                  </button>
                )
              })}
              {STATUS_FILTERS.filter((f) => f.key !== 'all').map((f) => {
                const active = statusFilter.includes(f.key)
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFilter(f.key, statusFilter, setStatusFilter)}
                    aria-pressed={active}
                    className="font-sans text-xs font-semibold px-2.5 py-1 transition-colors"
                    style={{
                      background: active ? '#2b2c2c' : '#f0ede9',
                      color: active ? '#ffffff' : '#5f5e5e',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
              {uniquePages.map((page) => {
                const active = pageFilter.includes(page)
                return (
                  <button
                    key={page}
                    onClick={() => toggleFilter(page, pageFilter, setPageFilter)}
                    aria-pressed={active}
                    className="font-sans text-xs px-2.5 py-1 transition-colors truncate max-w-[160px]"
                    style={{
                      background: active ? '#2b2c2c' : '#f0ede9',
                      color: active ? '#ffffff' : '#5f5e5e',
                    }}
                  >
                    {page}
                  </button>
                )
              })}
              {uniqueComponents.map((comp) => {
                const active = componentFilter.includes(comp)
                return (
                  <button
                    key={comp}
                    onClick={() => toggleFilter(comp, componentFilter, setComponentFilter)}
                    aria-pressed={active}
                    className="font-sans text-xs px-2.5 py-1 transition-colors truncate max-w-[160px]"
                    style={{
                      background: active ? '#2b2c2c' : '#f0ede9',
                      color: active ? '#ffffff' : '#5f5e5e',
                    }}
                  >
                    {comp}
                  </button>
                )
              })}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setPrincipleFilter('all')
                    setSeverityFilter([])
                    setStatusFilter([])
                    setPageFilter([])
                    setComponentFilter([])
                  }}
                  className="font-sans text-xs underline underline-offset-2 transition-colors"
                  style={{ color: '#610000' }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-primary px-4 py-3 mb-5"
              style={{ background: '#f0ede9' }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-sans text-sm">{error}</p>
            </div>
          )}

          {!isLoading && findings.length > 0 && (
            <p className="font-sans text-xs mb-2" style={{ color: '#5f5e5e' }}>
              {filtered.length === findings.length
                ? `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${findings.length} findings`}
            </p>
          )}

          {!isLoading && findings.length === 0 && !error && (
            <div className="py-24 text-center">
              <h2 className="font-serif font-bold text-2xl mb-2">No findings yet</h2>
              <p className="font-sans text-sm mb-8 max-w-xs mx-auto" style={{ color: '#5f5e5e' }}>
                Click &ldquo;Add finding&rdquo; in the Audit Toolkit to log your first accessibility issue.
              </p>
            </div>
          )}

          <FindingTable
            findings={filtered}
            isLoading={isLoading}
            onEdit={setEditFinding}
            onUpdate={updateFinding}
            onDelete={deleteFinding}
          />
        </main>
      </div>

      {/* ── Right sidebar: Audit Toolkit ── */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ background: '#f6f3f2', borderLeft: '1px solid #e0dbd9' }}
        aria-label="Audit toolkit"
      >
        <div className="px-6 pt-8 pb-6">
          <h2 className="font-serif font-bold text-xl mb-1" style={{ letterSpacing: '-0.01em' }}>
            Audit Toolkit
          </h2>
          <p className="font-sans text-xs leading-relaxed mb-6" style={{ color: '#5f5e5e' }}>
            Precision tools for modern accessibility compliance workflows.
          </p>

          {/* Primary: Add Finding */}
          <button
            className="flex w-full items-center justify-between px-4 py-3 mb-2 font-sans text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ background: '#610000', letterSpacing: '0.1em' }}
            onClick={openBlankFinding}
          >
            <span>Add Finding</span>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Secondary: Step-by-Step Audit */}
          <button
            className="flex w-full items-center justify-between px-4 py-3 mb-4 font-sans text-sm font-bold uppercase tracking-widest transition-colors hover:bg-[#e0dbd9]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
            onClick={openBlankFinding}
          >
            <span>Step-by-Step Audit</span>
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Tertiary buttons */}
          <div className="space-y-2">
            {/* Pages */}
            <button
              onClick={() => setPageModalOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Pages
              </span>
              <span
                className="flex items-center justify-center font-sans text-xs font-bold text-white"
                style={{ background: '#610000', borderRadius: '9999px', minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {project.auditUrls.length}
              </span>
            </button>

            {/* Components */}
            <button
              onClick={() => setComponentModalOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Components
              </span>
              <span
                className="flex items-center justify-center font-sans text-xs font-bold text-white"
                style={{ background: '#610000', borderRadius: '9999px', minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {project.components.length}
              </span>
            </button>

            {/* Configure Project */}
            <button
              onClick={() => setEditProjectOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                Configure Project
              </span>
            </button>
          </div>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={!!isExporting}
            aria-busy={isExporting === 'pdf'}
            className="flex w-full items-center justify-between px-4 py-3 mt-4 font-sans text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 hover:bg-[#d8d4d2]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
          >
            <span>{isExporting === 'pdf' ? 'Generating…' : 'Export Report (PDF)'}</span>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!!isExporting || findings.length === 0}
            aria-busy={isExporting === 'csv'}
            className="flex w-full items-center justify-between px-4 py-3 mt-1 font-sans text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 hover:bg-[#d8d4d2]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
          >
            <span>{isExporting === 'csv' ? 'Exporting…' : 'Export CSV'}</span>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Masthead divider */}
        <div style={{ height: '12px', background: '#e5e2e1' }} aria-hidden="true" />

        {/* Project Statistics */}
        <div className="px-6 py-6">
          <p className="font-sans text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#5f5e5e', letterSpacing: '0.12em' }}>
            Project Statistics
          </p>
          <dl className="space-y-5">
            <div>
              <dt className="font-sans text-xs mb-1" style={{ color: '#5f5e5e' }}>Compliance Score</dt>
              <dd className="font-serif font-bold" style={{ fontSize: '2.5rem', color: '#1a1a1a', lineHeight: 1 }}>
                {complianceScore}%
              </dd>
              <div className="mt-2 h-1.5" style={{ background: '#e0dbd9' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${complianceScore}%`, background: complianceScore >= 80 ? '#2d7a4f' : complianceScore >= 50 ? '#8b6914' : '#610000' }}
                />
              </div>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Total findings</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#1a1a1a' }}>{findings.length}</dd>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Open</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#610000' }}>
                {findings.filter((f) => f.status === 'open').length}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Resolved</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#2d7a4f' }}>{resolvedCount}</dd>
            </div>
          </dl>
        </div>
      </aside>

      {/* ── Add Page modal ── */}
      <Dialog open={pageModalOpen} onOpenChange={(o) => { setPageModalOpen(o); if (!o) setNewPageValue('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Page</DialogTitle>
            <DialogDescription>Enter a URL or page name to track in this audit.</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={newPageValue}
            onChange={(e) => setNewPageValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmAddPage() }}
            placeholder="/about or Home"
            className="w-full h-9 px-3 font-sans text-sm border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ borderColor: '#d0cac8' }}
          />
          <DialogFooter>
            <button
              onClick={() => { setPageModalOpen(false); setNewPageValue('') }}
              className="px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmAddPage}
              disabled={!newPageValue.trim()}
              className="px-4 py-2 font-sans text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#610000' }}
            >
              Add Page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Component modal ── */}
      <Dialog open={componentModalOpen} onOpenChange={(o) => { setComponentModalOpen(o); if (!o) setNewComponentValue('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>Enter a component name to track in this audit.</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={newComponentValue}
            onChange={(e) => setNewComponentValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmAddComponent() }}
            placeholder="Navigation, Hero, Footer…"
            className="w-full h-9 px-3 font-sans text-sm border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ borderColor: '#d0cac8' }}
          />
          <DialogFooter>
            <button
              onClick={() => { setComponentModalOpen(false); setNewComponentValue('') }}
              className="px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmAddComponent}
              disabled={!newComponentValue.trim()}
              className="px-4 py-2 font-sans text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#610000' }}
            >
              Add Component
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Slide-in finding form sidebar ── */}
      <FindingFormSidebar
        open={sidebarOpen}
        onClose={() => { setCreateOpen(false); setEditFinding(null); setFindingInitialData(undefined) }}
        onSubmit={editFinding ? handleEditFinding : handleCreateFinding}
        mode={editFinding ? 'edit' : 'create'}
        projectId={id!}
        auditPages={project.auditUrls}
        auditComponents={project.components}
        onAddPage={handleAddPage}
        onAddComponent={handleAddComponent}
        templates={templates}
        initialData={editFinding ? {
          ...editFinding,
          description: editFinding.description ?? undefined,
          wcagCriterion: editFinding.wcagCriterion ?? undefined,
          wcagLevel: editFinding.wcagLevel ?? undefined,
          category: editFinding.category ?? undefined,
          severity: editFinding.severity ?? undefined,
          status: editFinding.status ?? undefined,
          pageUrl: editFinding.pageUrl ?? undefined,
          component: editFinding.component ?? undefined,
          screenshotPath: editFinding.screenshotPath ?? undefined,
          recommendations: editFinding.recommendations ?? undefined,
          notes: editFinding.notes ?? undefined
        } : findingInitialData}
      />

      {/* Edit project sidebar */}
      <ProjectFormDialog
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        onSubmit={handleUpdateProject}
        mode="edit"
        initialData={{
          name: project.name,
          clientName: project.clientName ?? undefined,
          url: project.url ?? undefined,
          description: project.description ?? undefined,
          status: project.status,
          standards: project.standards ?? undefined,
          auditUrls: project.auditUrls,
          components: project.components
        }}
      />
    </div>
  )
}

