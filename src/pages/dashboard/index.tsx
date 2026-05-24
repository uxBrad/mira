import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, AlertCircle, Layers, Settings2, X } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { useToast } from '../../components/ui/use-toast'
import { EchoButton } from '../../components/ui/echo-button'
import { KVTag } from '../../components/ui/kv-tag'
import type { Project } from '../../../db/schema'

interface ProjectWithCount extends Project {
  findingCount: number
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'archived', label: 'Archived' },
]

type PanelMode = null | 'create' | 'edit' | 'archive'

function ArchivePanel({
  project,
  onConfirm,
  onClose,
  isArchiving,
}: {
  project: ProjectWithCount
  onConfirm: () => void
  onClose: () => void
  isArchiving: boolean
}) {
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#ffffff', borderLeft: '1px solid #e0dbd9' }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-between px-6"
        style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}
      >
        <span className="font-sans text-sm font-bold uppercase tracking-widest" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>
          Archive Project
        </span>
        <button
          onClick={onClose}
          className="flex items-center justify-center transition-colors hover:text-foreground"
          style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-3">
        <p className="font-sans text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>
          Archive <strong>&ldquo;{project.name}&rdquo;</strong>? The project and its{' '}
          {project.findingCount} finding{project.findingCount !== 1 ? 's' : ''} will be preserved but hidden from the default view.
        </p>
        <p className="font-sans text-sm" style={{ color: '#5f5e5e' }}>You can restore it anytime by editing the project status.</p>
      </div>

      <div
        className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4"
        style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}
      >
        <EchoButton onClick={onClose} disabled={isArchiving}>Cancel</EchoButton>
        <EchoButton variant="primary" onClick={onConfirm} disabled={isArchiving}>
          {isArchiving ? 'Archiving…' : 'Archive'}
        </EchoButton>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { projects, isLoading, error, createProject, updateProject } = useProjects()
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [panelProject, setPanelProject] = useState<ProjectWithCount | null>(null)
  const [panelMounted, setPanelMounted] = useState(false)
  const [panelWide, setPanelWide] = useState(false)
  const [isArchivingPanel, setIsArchivingPanel] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('in_progress')
  const navigate = useNavigate()
  const { toast } = useToast()

  const panelOpen = panelMode !== null

  useEffect(() => {
    function handleMenuNewProject() { openCreate() }
    window.addEventListener('menu:newProject', handleMenuNewProject)
    return () => window.removeEventListener('menu:newProject', handleMenuNewProject)
  }, [])

  const filtered =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)

  function openCreate() {
    setPanelMode('create')
    setPanelMounted(true)
    setPanelProject(null)
  }

  function openEdit(project: ProjectWithCount) {
    setPanelMode('edit')
    setPanelMounted(true)
    setPanelProject(project)
  }

  function openArchive(project: ProjectWithCount) {
    setPanelMode('archive')
    setPanelMounted(true)
    setPanelProject(project)
  }

  function closePanel() {
    setPanelMode(null)
    setPanelWide(false)
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
    closePanel()
    toast({ title: 'Project created', description: `"${project.name}" is ready.` })
    navigate(`/project/${project.id}`)
  }

  async function handleEdit(data: {
    name: string
    clientName?: string
    url?: string
    description?: string
    status?: string
    standards?: string
    auditUrls?: string[]
  }) {
    if (!panelProject) return
    await updateProject(panelProject.id, data)
    closePanel()
    toast({ title: 'Project updated' })
  }

  async function handleComplete(project: ProjectWithCount) {
    await updateProject(project.id, { status: 'complete' })
    toast({ title: 'Project completed', description: `"${project.name}" marked as complete.` })
  }

  async function handleArchiveConfirm() {
    if (!panelProject) return
    setIsArchivingPanel(true)
    try {
      await updateProject(panelProject.id, { status: 'archived' })
      closePanel()
      toast({ title: 'Project archived', description: `"${panelProject.name}" has been archived.` })
    } catch {
      toast({ variant: 'destructive', title: 'Archive failed' })
    } finally {
      setIsArchivingPanel(false)
    }
  }

  const toolkitWidth = '24.25rem'
  const tr = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1), flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{
        gap: '12px',
        background: 'transparent',
        padding: '12px',
      }}
    >
      {/* ── Main list ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          flex: panelOpen ? (panelWide ? '0 0 0px' : '0 0 calc(50% - 6px)') : '1 1 0%',
          transition: tr,
          borderRadius: '10px',
          background: '#fcf9f8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-10 pt-10 pb-5" style={{ background: '#fcf9f8' }}>
          <p className="font-sans text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>
            Audit Management
          </p>
          <h1 className="font-serif font-bold leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
            Projects
          </h1>
        </div>

        {/* Filter bar */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-10 py-3"
          style={{ borderBottom: '1px solid #e0dbd9', background: '#fcf9f8' }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
              className="font-sans text-xs font-semibold px-3 py-1.5 whitespace-nowrap transition-colors"
              style={{
                border: `1px solid ${statusFilter === f.key ? '#1d4ed8' : '#d0cac8'}`,
                background: statusFilter === f.key ? '#1d4ed8' : 'transparent',
                color: statusFilter === f.key ? '#fff' : '#2b2c2c',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {error && (
            <div role="alert" className="flex items-center gap-2 text-primary px-4 py-3 mb-6" style={{ background: '#ebe7e7' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-sans text-sm">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-px" aria-busy="true" aria-label="Loading projects">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse" style={{ background: '#ebe7e7' }} aria-hidden="true" />
              ))}
            </div>
          )}

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

          {!isLoading && filtered.length > 0 && (
            <ul className="space-y-0" role="list" aria-label="Audit projects">
              {filtered.map((project) => (
                <li key={project.id} className="mb-4">
                  <ProjectCard
                    project={project}
                    onClick={() => navigate(`/project/${project.id}`)}
                    onEdit={openEdit}
                    onArchive={openArchive}
                    onComplete={handleComplete}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Toolkit sidebar ── */}
      <aside
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: panelOpen ? '0' : toolkitWidth,
          transition: tr,
          background: '#f6f3f2',
          borderRadius: '10px',
        }}
        aria-label="Project tools"
        aria-hidden={panelOpen}
      >
        <div className="no-scrollbar flex flex-col h-full overflow-y-auto" style={{ width: toolkitWidth }}>
          <div className="px-5 pt-8 pb-8 flex flex-col gap-6">

            {/* Section: Projects */}
            <div>
              <h2 className="font-serif font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                Projects
              </h2>
              <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                Manage your accessibility audits.
              </p>
              <div className="space-y-2">
                <EchoButton
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                  iconPosition="right"
                  fullWidth
                  onClick={openCreate}
                >
                  New Project
                </EchoButton>
                <EchoButton
                  icon={<Settings2 className="h-4 w-4" />}
                  iconPosition="right"
                  fullWidth
                  onClick={() => navigate('/settings')}
                >
                  Settings
                </EchoButton>
                <EchoButton
                  icon={<Layers className="h-4 w-4" />}
                  iconPosition="right"
                  fullWidth
                  onClick={() => navigate('/templates')}
                >
                  Templates
                </EchoButton>
              </div>
            </div>

            {/* Section: Summary */}
            {projects.length > 0 && (
              <div>
                <h2 className="font-serif font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                  Summary
                </h2>
                <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                  Across all your projects.
                </p>
                <div className="flex flex-wrap gap-2">
                  <KVTag label="Projects" value={String(projects.length)} />
                  <KVTag label="In Progress" value={String(projects.filter((p) => p.status === 'in_progress').length)} />
                  <KVTag label="Findings" value={String(projects.reduce((sum, p) => sum + (p.findingCount ?? 0), 0))} valueVariant="fail" />
                </div>
              </div>
            )}

          </div>
        </div>
      </aside>

      {/* ── Right panel: create / edit / delete ── */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: panelOpen ? (panelWide ? '100%' : 'calc(50% - 6px)') : '0',
          transition: tr,
          borderRadius: '10px',
          overflow: 'hidden',
        }}
        aria-hidden={!panelOpen}
      >
        {panelMounted && (
          <>
            {panelMode === 'create' && (
              <ProjectFormDialog
                open={panelMode === 'create'}
                onOpenChange={(o) => { if (!o) closePanel() }}
                onSubmit={handleCreate}
                mode="create"
                isWide={panelWide}
                onToggleWide={() => setPanelWide(w => !w)}
              />
            )}
            {panelMode === 'edit' && panelProject && (
              <ProjectFormDialog
                open={panelMode === 'edit'}
                onOpenChange={(o) => { if (!o) closePanel() }}
                onSubmit={handleEdit}
                mode="edit"
                initialData={{
                  name: panelProject.name,
                  clientName: panelProject.clientName ?? undefined,
                  url: panelProject.url ?? undefined,
                  description: panelProject.description ?? undefined,
                  status: panelProject.status,
                  standards: panelProject.standards ?? undefined,
                }}
                isWide={panelWide}
                onToggleWide={() => setPanelWide(w => !w)}
              />
            )}
            {panelMode === 'archive' && panelProject && (
              <ArchivePanel
                project={panelProject}
                onConfirm={handleArchiveConfirm}
                onClose={closePanel}
                isArchiving={isArchivingPanel}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
