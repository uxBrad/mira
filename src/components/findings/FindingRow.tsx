import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { EchoButton } from '../ui/echo-button'
import { EchoPill } from '../ui/echo-pill'
import { KVTag } from '../ui/kv-tag'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../ui/select'
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

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  needs_review: 'Needs Review',
  resolved: 'Resolved',
  wont_fix: "Won't Fix"
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#c0392b',
  serious: '#c0392b',
  moderate: '#8b6914',
  minor: '#2d7a4f'
}

function statusPill(status: string | null) {
  if (status === 'resolved') return <EchoPill variant="pass" label="PASS" />
  if (status === 'wont_fix') return <EchoPill variant="unknown" label="N/A" />
  return <EchoPill variant="fail" label="FAIL" />
}

export function FindingRow({ finding, onEdit, onUpdate, onDelete }: FindingRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleStatusChange(status: string) {
    await onUpdate(finding.id, { status })
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(finding.id)
      setDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const severityColor = SEVERITY_COLORS[finding.severity ?? ''] ?? '#5f5e5e'

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
        {/* Top row: badges left | criterion right */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {statusPill(finding.status)}
            {finding.wcagLevel && (
              <EchoPill variant="level" label={`Level ${finding.wcagLevel}`} />
            )}
            {finding.severity && (
              <span
                className="font-sans text-xs font-semibold"
                style={{ color: severityColor }}
              >
                · {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {finding.wcagCriterion && (
              <span className="font-serif italic text-sm" style={{ color: '#5f5e5e' }}>
                Criterion {finding.wcagCriterion}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-serif font-bold leading-snug mb-3"
          style={{ fontSize: '1.2rem', letterSpacing: '-0.01em', color: '#1a1a1a' }}
        >
          {finding.title}
        </h3>

        {/* Description */}
        {finding.description && (
          <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
            {finding.description}
          </p>
        )}

        {/* Notes */}
        {finding.notes && (
          <p className="font-sans text-xs italic mb-3" style={{ color: '#5f5e5e' }}>
            Note: {finding.notes}
          </p>
        )}

        {/* Footer: tags + actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid #f0ede9' }}>
          <div className="flex flex-wrap gap-1.5">
            {finding.pageUrl && (
              <KVTag label="Page" value={finding.pageUrl} />
            )}
            {finding.component && (
              <KVTag label="Component" value={finding.component} />
            )}
            {finding.standards?.map((s) => (
              <span key={s} className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e', borderRadius: '3px' }}>
                {s}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Select value={finding.status || 'open'} onValueChange={handleStatusChange}>
              <SelectTrigger
                style={{ height: '32px', fontSize: '13px', minWidth: '130px', fontFamily: 'inherit' }}
                aria-label="Finding status"
              >
                <span>{STATUS_LABELS[finding.status || 'open'] || finding.status}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
              </SelectContent>
            </Select>

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
            <EchoButton onClick={() => setDeleteOpen(false)}>
              Cancel
            </EchoButton>
            <EchoButton
              variant="primary"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </EchoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
