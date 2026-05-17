import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, AlertCircle } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'
import { EchoButton } from '../../components/ui/echo-button'
import { KVTag } from '../../components/ui/kv-tag'

const FILTERS = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
]

export default function DashboardPage() {
  const { projects, isLoading, error, createProject, updateProject, deleteProject } = useProjects()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createFormMounted, setCreateFormMounted] = useState(false)
  const [createFormWide, setCreateFormWide] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('in_progress')
  const navigate = useNavigate()
  const { toast } = useToast()

  const filtered =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)

  function openCreate() {
    setIsCreateOpen(true)
    setCreateFormMounted(true)
  }

  function closeCreate() {
    setIsCreateOpen(false)
    setCreateFormWide(false)
  }

  async function handleCreate(data: {
    name: string
    clientName?: string
    url?: string
    description?: string
    standards?: string
    auditUrls?: string[]
  }) {
    const project = await createProject(data)
    closeCreate()
    toast({ title: 'Project created', description: `"${project.name}" is ready.` })
    navigate(`/project/${project.id}`)
  }

  const toolkitWidth = '24.25rem'
  const tr = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{
        gap: '12px',
        background: '#d8d3d1',
        padding: '12px',
        transition: tr,
      }}
    >
      {/* ── Main list ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          flex: isCreateOpen ? (createFormWide ? '0 0 0px' : '0 0 calc(50% - 6px)') : '1 1 0%',
          transition: tr,
          borderRadius: '10px',
          background: '#fcf9f8',
          overflow: 'hidden',
        }}
      >
        <div className="flex-1 overflow-y-auto px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <p className="font-sans text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#610000', letterSpacing: '0.12em' }}>
              Audit Management
            </p>
            <h1 className="font-serif font-bold leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              Projects
            </h1>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="flex items-center gap-2 text-primary px-4 py-3 mb-6" style={{ background: '#ebe7e7' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-sans text-sm">{error}</p>
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
              <h2 className="font-serif font-bold text-2xl mb-1">
                {statusFilter !== 'all' ? 'No projects in this category' : 'No projects yet'}
              </h2>
              <p className="font-sans text-sm mb-6 max-w-xs" style={{ color: '#5f5e5e' }}>
                {statusFilter !== 'all'
                  ? 'Try a different filter or create a new project.'
                  : 'Create your first accessibility audit project to get started.'}
              </p>
              <EchoButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                iconPosition="left"
                onClick={openCreate}
              >
                New project
              </EchoButton>
            </div>
          )}

          {/* Project list */}
          {!isLoading && filtered.length > 0 && (
            <ul className="space-y-0" role="list" aria-label="Audit projects">
              {filtered.map((project) => (
                <li key={project.id} className="mb-4">
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
      </div>

      {/* ── Toolkit sidebar — sibling of main, not nested inside ── */}
      <aside
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: isCreateOpen ? '0' : toolkitWidth,
          transition: tr,
          background: '#f6f3f2',
          borderRadius: '10px',
        }}
        aria-label="Project tools"
        aria-hidden={isCreateOpen}
      >
        <div className="flex flex-col h-full overflow-y-auto px-7 py-10" style={{ width: toolkitWidth }}>
          <EchoButton
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            iconPosition="right"
            fullWidth
            className="mb-8"
            onClick={openCreate}
          >
            New Project
          </EchoButton>

          {/* Filter controls */}
          {projects.length > 0 && (
            <div>
              <p className="font-sans text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
                Filter
              </p>
              <div className="space-y-0.5" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    aria-pressed={statusFilter === f.key}
                    className={`w-full text-left px-3 py-2.5 font-sans text-sm transition-colors ${
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
              <p className="font-sans text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
                Summary
              </p>
              <div className="flex flex-wrap gap-2">
                <KVTag label="Projects" value={String(projects.length)} />
                <KVTag label="In Progress" value={String(projects.filter((p) => p.status === 'in_progress').length)} />
                <KVTag label="Findings" value={String(projects.reduce((sum, p) => sum + (p.findingCount ?? 0), 0))} valueVariant="fail" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── New Project form — in-layout split-screen panel ── */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: isCreateOpen ? (createFormWide ? '100%' : 'calc(50% - 6px)') : '0',
          transition: tr,
          borderRadius: '10px',
          overflow: 'hidden',
        }}
        aria-hidden={!isCreateOpen}
      >
        {createFormMounted && (
          <ProjectFormDialog
            open={isCreateOpen}
            onOpenChange={(o) => { if (!o) closeCreate() }}
            onSubmit={handleCreate}
            mode="create"
            isWide={createFormWide}
            onToggleWide={() => setCreateFormWide(w => !w)}
          />
        )}
      </div>
    </div>
  )
}
