import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { EchoButton } from '../ui/echo-button'
import { EchoPill } from '../ui/echo-pill'
import { ProjectFormDialog } from './ProjectFormDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'
import { formatRelativeDate } from '../../lib/utils'
import { useToast } from '../ui/use-toast'
import type { Project } from '../../../db/schema'

interface ProjectWithCount extends Project {
  findingCount: number
}

interface ProjectCardProps {
  project: ProjectWithCount
  onClick: () => void
  onUpdate: (
    id: string,
    data: { name?: string; clientName?: string; url?: string; description?: string; status?: string }
  ) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  archived: 'Archived'
}

export function ProjectCard({ project, onClick, onUpdate, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  async function handleUpdate(data: {
    name: string
    clientName?: string
    url?: string
    description?: string
  }) {
    await onUpdate(project.id, data)
    setEditOpen(false)
    toast({ title: 'Project updated' })
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(project.id)
      setDeleteOpen(false)
      toast({ title: 'Project deleted', description: `"${project.name}" has been deleted.` })
    } catch {
      toast({ variant: 'destructive', title: 'Delete failed' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <article
        className="p-5 cursor-pointer group transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.06)'
        }}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
        aria-label={`${project.name}${project.clientName ? `, client: ${project.clientName}` : ''}, ${project.findingCount} findings`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2
              className="font-serif font-bold leading-tight mb-1"
              style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#1a1a1a' }}
            >
              {project.name}
            </h2>
            {project.clientName && (
              <p className="font-sans text-sm mb-0" style={{ color: '#5f5e5e' }}>{project.clientName}</p>
            )}
          </div>
          <button
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-8 h-8 transition-opacity"
            style={{ color: '#9a9897' }}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
            aria-label={`Options for ${project.name}`}
            aria-haspopup="dialog"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {project.description && (
          <p className="font-sans text-sm leading-relaxed mt-2 mb-3" style={{ color: '#5f5e5e' }}>{project.description}</p>
        )}

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f0ede9' }}>
          <EchoPill variant="level" label={STATUS_LABELS[project.status] || project.status} />
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
              {project.findingCount} issue{project.findingCount !== 1 ? 's' : ''}
            </span>
            <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>·</span>
            <span className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
              {formatRelativeDate(project.updatedAt)}
            </span>
          </div>
        </div>
      </article>

      {/* Quick actions dialog */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base truncate">{project.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <EchoButton
              icon={<Pencil className="h-4 w-4" />}
              iconPosition="left"
              fullWidth
              onClick={() => { setMenuOpen(false); setEditOpen(true) }}
            >
              Edit project
            </EchoButton>
            {project.url && (
              <EchoButton
                icon={<ExternalLink className="h-4 w-4" />}
                iconPosition="left"
                fullWidth
                onClick={() => { setMenuOpen(false); window.open(project.url!, '_blank') }}
              >
                Open URL
              </EchoButton>
            )}
            <EchoButton
              icon={<Trash2 className="h-4 w-4" />}
              iconPosition="left"
              fullWidth
              onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
              style={{ color: '#610000' }}
            >
              Delete project
            </EchoButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ maxHeight: '90vh' }}>
          <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <ProjectFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              onSubmit={handleUpdate}
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
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{project.name}&rdquo; and all{' '}
              {project.findingCount} finding{project.findingCount !== 1 ? 's' : ''} within it.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <EchoButton onClick={() => setDeleteOpen(false)}>
              Cancel
            </EchoButton>
            <EchoButton variant="primary" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete project'}
            </EchoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
