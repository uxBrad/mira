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
import { FindingFormDialog } from '../../components/findings/FindingFormDialog'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'
import type { Project } from '../../../db/schema'

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  archived: 'Archived'
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)

  const { findings, isLoading, error, createFinding, updateFinding, deleteFinding } = useFindings(
    id!
  )

  useEffect(() => {
    if (!id) return
    window.api.projects
      .get(id)
      .then(setProject)
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setIsLoadingProject(false))
  }, [id, navigate])

  async function handleCreateFinding(data: Parameters<typeof createFinding>[0]) {
    await createFinding(data)
    setCreateOpen(false)
    toast({ title: 'Finding added' })
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
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Breadcrumb / back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        aria-label="Back to dashboard"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All projects
      </button>

      {/* Project header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{project.name}</h1>
            <Badge variant={project.status === 'in_progress' ? 'default' : 'secondary'}>
              {STATUS_LABELS[project.status] || project.status}
            </Badge>
          </div>
          {project.clientName && (
            <p className="text-sm text-muted-foreground">{project.clientName}</p>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              {project.url}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditProjectOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!!isExporting || findings.length === 0}
            aria-busy={isExporting === 'csv'}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isExporting === 'csv' ? 'Exporting…' : 'CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={!!isExporting}
            aria-busy={isExporting === 'pdf'}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {isExporting === 'pdf' ? 'Generating…' : 'PDF report'}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add finding
          </Button>
        </div>
      </div>

      {/* Severity summary cards */}
      {findings.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          role="region"
          aria-label="Finding severity summary"
        >
          {[
            { label: 'Critical', count: severityCounts.critical, cls: 'text-red-600 bg-red-50 border-red-200' },
            { label: 'Serious', count: severityCounts.serious, cls: 'text-orange-600 bg-orange-50 border-orange-200' },
            { label: 'Moderate', count: severityCounts.moderate, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
            { label: 'Minor', count: severityCounts.minor, cls: 'text-green-700 bg-green-50 border-green-200' }
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border px-4 py-3 ${s.cls}`}
              aria-label={`${s.count} ${s.label.toLowerCase()} findings`}
            >
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div role="alert" className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Findings table */}
      <FindingTable
        findings={findings}
        isLoading={isLoading}
        projectId={id!}
        onUpdate={updateFinding}
        onDelete={deleteFinding}
      />

      {/* Create finding dialog */}
      <FindingFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateFinding}
        mode="create"
        projectId={id!}
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
