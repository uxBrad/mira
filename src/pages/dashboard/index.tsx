import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, AlertCircle } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/button'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'

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
    <div className="px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length === 0
              ? 'Create your first project to get started'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New project
        </Button>
      </div>

      {/* Filters */}
      {projects.length > 0 && (
        <div className="flex gap-2 mb-5" role="group" aria-label="Filter projects by status">
          {['all', 'in_progress', 'complete', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {s === 'all'
                ? 'All'
                : s === 'in_progress'
                ? 'In Progress'
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
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

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading projects">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && !error && (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
          <h2 className="font-semibold text-lg mb-1">
            {statusFilter !== 'all' ? 'No projects in this category' : 'No projects yet'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {statusFilter !== 'all'
              ? 'Try a different filter or create a new project.'
              : 'Start by creating your first accessibility audit project.'}
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New project
          </Button>
        </div>
      )}

      {/* Projects grid */}
      {!isLoading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Audit projects">
          {filtered.map((project) => (
            <li key={project.id}>
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

      <ProjectFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        mode="create"
      />
    </div>
  )
}
