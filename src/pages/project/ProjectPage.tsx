import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Download,
  FileText,
  ExternalLink,
  AlertCircle,
  Pencil,
  ChevronDown
} from 'lucide-react'
import { useFindings } from '../../hooks/useFindings'
import { useTemplates } from '../../hooks/useTemplates'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { FindingTable } from '../../components/findings/FindingTable'
import { FindingFormSidebar } from '../../components/findings/FindingFormSidebar'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'

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
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pageFilter, setPageFilter] = useState('all')
  const [componentFilter, setComponentFilter] = useState('all')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [findingInitialData, setFindingInitialData] = useState<Partial<Finding> | undefined>(undefined)
  const templatePickerRef = useRef<HTMLDivElement>(null)

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

  // Close template picker when clicking outside
  useEffect(() => {
    if (!templatePickerOpen) return
    function handleClick(e: MouseEvent) {
      if (templatePickerRef.current && !templatePickerRef.current.contains(e.target as Node)) {
        setTemplatePickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [templatePickerOpen])

  // Derived filter options from findings
  const uniquePages = Array.from(
    new Set(findings.map((f) => f.pageUrl).filter((p): p is string => !!p))
  )
  const uniqueComponents = Array.from(
    new Set(findings.map((f) => f.component).filter((c): c is string => !!c))
  )

  const filtered = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (pageFilter !== 'all' && f.pageUrl !== pageFilter) return false
    if (componentFilter !== 'all' && f.component !== componentFilter) return false
    return true
  })

  const activeFilterCount = [
    severityFilter !== 'all',
    statusFilter !== 'all',
    pageFilter !== 'all',
    componentFilter !== 'all'
  ].filter(Boolean).length

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
  }) {
    if (!id) return
    const updated = await window.api.projects.update(id, data)
    setProject(updated as Project)
    setEditProjectOpen(false)
    toast({ title: 'Project updated' })
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

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top header bar ── */}
      <div
        className="flex-shrink-0 px-8 py-5"
        style={{ borderBottom: '1px solid #ebe7e7' }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-data text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant={project.status === 'in_progress' ? 'default' : 'secondary'}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {project.clientName && (
                <span className="font-data text-sm text-muted-foreground">{project.clientName}</span>
              )}
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-data text-xs text-primary hover:underline"
                >
                  {project.url}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
            {project.description && (
              <p className="font-data text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {findings.length > 0 && (
            <div className="flex items-center gap-3 flex-shrink-0" role="region" aria-label="Finding severity summary">
              {[
                { label: 'Critical', count: severityCounts.critical, color: 'text-red-600' },
                { label: 'Serious', count: severityCounts.serious, color: 'text-orange-600' },
                { label: 'Moderate', count: severityCounts.moderate, color: 'text-yellow-700' },
                { label: 'Minor', count: severityCounts.minor, color: 'text-green-700' }
              ].map((s) => (
                <div key={s.label} className="text-center" aria-label={`${s.count} ${s.label.toLowerCase()}`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="font-data text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: filter panel */}
        <aside
          className="w-52 flex-shrink-0 flex flex-col px-5 py-6 overflow-y-auto"
          style={{ background: '#f6f3f2', borderRight: '1px solid #ebe7e7' }}
          aria-label="Filter findings"
        >
          {/* Severity */}
          <div className="mb-6">
            <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Severity
            </p>
            <div className="space-y-0.5" role="group" aria-label="Filter by severity">
              {SEVERITY_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSeverityFilter(f.key)}
                  aria-pressed={severityFilter === f.key}
                  className={`w-full text-left px-3 py-2 font-data text-sm transition-colors ${
                    severityFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1 text-xs opacity-60">
                      ({severityCounts[f.key as keyof typeof severityCounts] ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Status
            </p>
            <div className="space-y-0.5" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  aria-pressed={statusFilter === f.key}
                  className={`w-full text-left px-3 py-2 font-data text-sm transition-colors ${
                    statusFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page filter */}
          {uniquePages.length > 0 && (
            <div className="mb-6">
              <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
                Page
              </p>
              <div className="space-y-0.5" role="group" aria-label="Filter by page">
                <button
                  onClick={() => setPageFilter('all')}
                  aria-pressed={pageFilter === 'all'}
                  className={`w-full text-left px-3 py-2 font-data text-sm transition-colors ${
                    pageFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                  }`}
                >
                  All pages
                </button>
                {uniquePages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setPageFilter(page)}
                    aria-pressed={pageFilter === page}
                    className={`w-full text-left px-3 py-2 font-data text-sm transition-colors truncate ${
                      pageFilter === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Component filter */}
          {uniqueComponents.length > 0 && (
            <div className="mb-6">
              <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
                Component
              </p>
              <div className="space-y-0.5" role="group" aria-label="Filter by component">
                <button
                  onClick={() => setComponentFilter('all')}
                  aria-pressed={componentFilter === 'all'}
                  className={`w-full text-left px-3 py-2 font-data text-sm transition-colors ${
                    componentFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                  }`}
                >
                  All components
                </button>
                {uniqueComponents.map((comp) => (
                  <button
                    key={comp}
                    onClick={() => setComponentFilter(comp)}
                    aria-pressed={componentFilter === comp}
                    className={`w-full text-left px-3 py-2 font-data text-sm transition-colors truncate ${
                      componentFilter === comp
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSeverityFilter('all')
                setStatusFilter('all')
                setPageFilter('all')
                setComponentFilter('all')
              }}
              className="font-data text-xs text-primary hover:underline underline-offset-4 text-left px-3"
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* Center: findings */}
        <main id="main-findings" className="flex-1 overflow-y-auto px-8 py-6">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-primary px-4 py-3 mb-5"
              style={{ background: '#ebe7e7' }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-data text-sm">{error}</p>
            </div>
          )}

          {!isLoading && findings.length > 0 && (
            <p className="font-data text-xs text-muted-foreground mb-4">
              {filtered.length === findings.length
                ? `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${findings.length} findings`}
            </p>
          )}

          {!isLoading && findings.length === 0 && !error && (
            <div className="py-20 text-center">
              <h2 className="font-semibold text-lg mb-1">No findings yet</h2>
              <p className="font-data text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Click &ldquo;Add finding&rdquo; to log your first accessibility issue.
              </p>
              <Button onClick={openBlankFinding}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add finding
              </Button>
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

        {/* Right: actions panel */}
        <aside
          className="w-56 flex-shrink-0 flex flex-col px-6 py-6 overflow-y-auto"
          style={{ background: '#f6f3f2', borderLeft: '1px solid #ebe7e7' }}
          aria-label="Project actions"
        >
          {/* Split button: Add finding / Add from template */}
          <div className="mb-2 relative" ref={templatePickerRef}>
            <div className="flex w-full" style={{ borderRadius: 0 }}>
              <Button
                className="flex-1 justify-start"
                style={{ borderRadius: 0 }}
                onClick={openBlankFinding}
              >
                <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Add finding
              </Button>
              <Button
                variant="outline"
                className="px-2 border-l-0"
                style={{ borderRadius: 0, borderLeft: '1px solid rgba(0,0,0,0.15)' }}
                onClick={() => setTemplatePickerOpen((v) => !v)}
                aria-label="Add finding from template"
                aria-expanded={templatePickerOpen}
                aria-haspopup="listbox"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Template picker dropdown */}
            {templatePickerOpen && (
              <div
                className="absolute top-full left-0 right-0 z-20 border shadow-md overflow-hidden"
                style={{ background: '#fcf9f8', borderColor: '#ebe7e7' }}
                role="listbox"
                aria-label="Select a finding template"
              >
                {templates.length === 0 ? (
                  <p className="px-3 py-2.5 font-data text-xs text-muted-foreground">
                    No templates yet — create them in Finding Templates.
                  </p>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-2.5 font-data text-sm hover:bg-[#ebe7e7] transition-colors"
                      onClick={() => applyTemplate(t)}
                      role="option"
                    >
                      {t.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 mt-2">
            <button
              onClick={() => setEditProjectOpen(true)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 font-data text-sm text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground transition-colors"
            >
              <Pencil className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              Edit project
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!!isExporting || findings.length === 0}
              aria-busy={isExporting === 'csv'}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 font-data text-sm text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {isExporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!!isExporting}
              aria-busy={isExporting === 'pdf'}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 font-data text-sm text-muted-foreground hover:bg-[#ebe7e7] hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {isExporting === 'pdf' ? 'Generating…' : 'PDF report'}
            </button>
          </div>

          {findings.length > 0 && (
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid #ebe7e7' }}>
              <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
                Summary
              </p>
              <dl className="space-y-3">
                <div>
                  <dt className="font-data text-xs text-muted-foreground">Total findings</dt>
                  <dd className="font-data text-2xl font-bold text-foreground">{findings.length}</dd>
                </div>
                <div>
                  <dt className="font-data text-xs text-muted-foreground">Open</dt>
                  <dd className="font-data text-2xl font-bold text-primary">
                    {findings.filter((f) => f.status === 'open').length}
                  </dd>
                </div>
                <div>
                  <dt className="font-data text-xs text-muted-foreground">Resolved</dt>
                  <dd className="font-data text-2xl font-bold text-foreground">
                    {findings.filter((f) => f.status === 'resolved').length}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>

      {/* ── Slide-in finding form sidebar ── */}
      <FindingFormSidebar
        open={sidebarOpen}
        onClose={() => { setCreateOpen(false); setEditFinding(null); setFindingInitialData(undefined) }}
        onSubmit={editFinding ? handleEditFinding : handleCreateFinding}
        mode={editFinding ? 'edit' : 'create'}
        projectId={id!}
        auditPages={project.auditUrls}
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
          auditUrls: project.auditUrls
        }}
      />
    </div>
  )
}
