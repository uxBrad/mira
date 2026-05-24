import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { EchoButton } from '../ui/echo-button'
import { EchoPill } from '../ui/echo-pill'
import { KVTag } from '../ui/kv-tag'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'

interface Finding {
  id: string
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
  recommendations: string | null
  notes: string | null
  createdAt: number
}

interface FindingRowProps {
  finding: Finding
  onEdit: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
}

function statusPill(status: string | null) {
  if (status === 'resolved') return <EchoPill variant="pass" label="PASS" />
  if (status === 'wont_fix') return <EchoPill variant="unknown" label="N/A" />
  return null
}

export function FindingRow({ finding, onEdit, onDelete }: FindingRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(finding.id)
      setDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const hasTags = finding.pageUrl || finding.component

  return (
    <>
      <article
        className="mb-4 p-5"
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.06)'
        }}
        aria-label={finding.title}
      >
        {/* Top row: title + status pill — then action buttons flush right */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <h3
              className="font-serif font-bold leading-snug"
              style={{ fontSize: '1.2rem', letterSpacing: '-0.01em', color: '#1a1a1a' }}
            >
              {finding.title}
            </h3>
            {statusPill(finding.status)}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <EchoButton
              icon={<Pencil className="w-4 h-4" />}
              iconPosition="left"
              onClick={onEdit}
              aria-label={`Edit: ${finding.title}`}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              Edit
            </EchoButton>
            <EchoButton
              icon={<Trash2 className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Delete: ${finding.title}`}
              style={{ padding: '6px 12px', fontSize: '14px' }}
            >
              Delete
            </EchoButton>
          </div>
        </div>

        {/* Description */}
        {finding.description && (
          <p className="font-sans text-sm leading-relaxed mb-2" style={{ color: '#5f5e5e' }}>
            {finding.description}
          </p>
        )}

        {/* Notes */}
        {finding.notes && (
          <p className="font-sans text-xs italic mb-2" style={{ color: '#5f5e5e' }}>
            Note: {finding.notes}
          </p>
        )}

        {/* Tags */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {finding.pageUrl && (
              <KVTag label="Page" value={finding.pageUrl} />
            )}
            {finding.component && (
              <KVTag label="Component" value={finding.component} />
            )}
          </div>
        )}
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete finding?</DialogTitle>
            <DialogDescription>
              &ldquo;{finding.title}&rdquo; will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <EchoButton onClick={() => setDeleteOpen(false)}>Cancel</EchoButton>
            <EchoButton variant="primary" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </EchoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
