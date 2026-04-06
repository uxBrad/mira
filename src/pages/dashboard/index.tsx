import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, AlertCircle } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/button'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'archived', label: 'Archived' }
]

export default function DashboardPage() {
  const { projects, isLoading, error, createProject, updateProject, deleteProject } = useProjects()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const navigate = useNavigate()
  const { toast } = useToast()

  const filtered =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)

  async function handleCreate(data: {
    name: string
    clientName?: string
    url?: string
    description?: string
  }) {
    const project = await createProject(data)
    setIsCreateOpen(false)
    toast({ title: 'Project created', description: `"${project.name}" is ready.` })
    navigate(`/project/${project.id}`)
  }

  return (
    <div className="flex h-full">
      {/* Main list — 65% */}
      <div className="flex-1 overflow-y-auto px-10 py-10">

        {/* Page header */}
        <div className="mb-10">
          <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
            Audit Management
          </p>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Projects
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-2 text-primary px-4 py-3 mb-6" style={{ background: '#ebe7e7' }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="font-data text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-px" aria-busy="true" aria-label="Loading projects">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse" style={{ background: '#ebe7e7' }} aria-hidden="true" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && !error && (
          <div className="py-24">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-4" aria-hidden="true" />
            <h2 className="font-semibold text-lg mb-1">
              {statusFilter !== 'all' ? 'No projects in this category' : 'No projects yet'}
            </h2>
            <p className="font-data text-sm text-muted-foreground mb-6 max-w-xs">
              {statusFilter !== 'all'
                ? 'Try a different filter or create a new project.'
                : 'Create your first accessibility audit project to get started.'}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Button>
          </div>
        )}

        {/* Project list — no dividers, use spacing */}
        {!isLoading && filtered.length > 0 && (
          <ul className="space-y-0" role="list" aria-label="Audit projects">
            {filtered.map((project, i) => (
              <li key={project.id} style={{ background: i % 2 === 1 ? '#ebe7e7' : 'transparent' }}>
                <ProjectCard
                  project={project}
                  onClick={() => navigate(`/project/${project.id}`)}
                  onUpdate={updateProject}
                  onDelete={deleteProject}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tool pane — 35%, surface-low */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col px-7 py-10 overflow-y-auto"
        style={{ background: '#f6f3f2' }}
        aria-label="Project tools"
      >
        <Button onClick={() => setIsCreateOpen(true)} className="w-full mb-8">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New project
        </Button>

        {/* Filter controls */}
        {projects.length > 0 && (
          <div>
            <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Filter
            </p>
            <div className="space-y-0.5" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  aria-pressed={statusFilter === f.key}
                  className={`w-full text-left px-3 py-2.5 font-data text-sm transition-colors ${
                    statusFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-high hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {projects.length > 0 && (
          <div className="mt-8 pt-8" style={{ borderTop: '1px solid #ebe7e7' }}>
            <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Summary
            </p>
            <dl className="space-y-3">
              <div>
                <dt className="font-data text-xs text-muted-foreground">Total projects</dt>
                <dd className="font-data text-2xl font-bold text-foreground">{projects.length}</dd>
              </div>
              <div>
                <dt className="font-data text-xs text-muted-foreground">In progress</dt>
                <dd className="font-data text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status === 'in_progress').length}
                </dd>
              </div>
              <div>
                <dt className="font-data text-xs text-muted-foreground">Total findings</dt>
                <dd className="font-data text-2xl font-bold text-primary">
                  {projects.reduce((sum, p) => sum + (p.findingCount ?? 0), 0)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </aside>

      <ProjectFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        mode="create"
      />
    </div>
  )
}
