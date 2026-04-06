import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Download,
  FileText,
  ExternalLink,
  AlertCircle,
  Pencil
} from 'lucide-react'
import { useFindings } from '../../hooks/useFindings'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { FindingTable } from '../../components/findings/FindingTable'
import { FindingFormSidebar } from '../../components/findings/FindingFormSidebar'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'
import type { Project } from '../../../db/schema'

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

  const { findings, isLoading, error, createFinding, updateFinding, deleteFinding } = useFindings(id!)

  useEffect(() => {
    if (!id) return
    window.api.projects
      .get(id)
      .then(setProject)
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setIsLoadingProject(false))
  }, [id, navigate])

  const filtered = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    return true
  })

  async function handleCreateFinding(data: Parameters<typeof createFinding>[0]) {
    await createFinding(data)
    setCreateOpen(false)
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
  }) {
    if (!id) return
    const updated = await window.api.projects.update(id, data)
    setProject(updated)
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

  const activeFilterCount = [severityFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top header bar ── */}
      <div
        className="flex-shrink-0 px-8 py-5"
        style={{ borderBottom: '1px solid #ebe7e7' }}
      >
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-data text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All projects
        </button>

        {/* Project name + meta */}
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

          {/* Severity summary — inline in header */}
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

      {/* ── Body: left filters + center findings + right actions ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: filter panel */}
        <aside
          className="w-52 flex-shrink-0 flex flex-col px-5 py-6 overflow-y-auto"
          style={{ background: '#f6f3f2', borderRight: '1px solid #ebe7e7' }}
          aria-label="Filter findings"
        >
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

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSeverityFilter('all'); setStatusFilter('all') }}
              className="font-data text-xs text-primary hover:underline underline-offset-4 text-left px-3"
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* Center: findings */}
        <main
          id="main-findings"
          className="flex-1 overflow-y-auto px-8 py-6"
        >
          {/* Error */}
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

          {/* Count label */}
          {!isLoading && findings.length > 0 && (
            <p className="font-data text-xs text-muted-foreground mb-4">
              {filtered.length === findings.length
                ? `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${findings.length} findings`}
            </p>
          )}

          {/* Empty project state */}
          {!isLoading && findings.length === 0 && !error && (
            <div className="py-20 text-center">
              <h2 className="font-semibold text-lg mb-1">No findings yet</h2>
              <p className="font-data text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Click "Add finding" to log your first accessibility issue.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
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
          <Button
            className="w-full mb-2"
            onClick={() => { setEditFinding(null); setCreateOpen(true) }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add finding
          </Button>

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

          {/* Summary stats */}
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
        onClose={() => { setCreateOpen(false); setEditFinding(null) }}
        onSubmit={editFinding ? handleEditFinding : handleCreateFinding}
        mode={editFinding ? 'edit' : 'create'}
        projectId={id!}
        initialData={editFinding ? {
          ...editFinding,
          description: editFinding.description ?? undefined,
          wcagCriterion: editFinding.wcagCriterion ?? undefined,
          wcagLevel: editFinding.wcagLevel ?? undefined,
          category: editFinding.category ?? undefined,
          severity: editFinding.severity ?? undefined,
          status: editFinding.status ?? undefined,
          pageUrl: editFinding.pageUrl ?? undefined,
          screenshotPath: editFinding.screenshotPath ?? undefined,
          recommendations: editFinding.recommendations ?? undefined,
          notes: editFinding.notes ?? undefined
        } : undefined}
      />

      {/* Edit project dialog */}
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
          status: project.status
        }}
      />
    </div>
  )
}
