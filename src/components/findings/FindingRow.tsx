import { useState } from 'react'
import { Pencil, Trash2, Eye } from 'lucide-react'
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

function FailBadge({ status }: { status: string | null }) {
  if (status === 'resolved') {
    return (
      <span
        className="inline-block font-sans text-xs font-bold tracking-widest uppercase px-2.5 py-0.5"
        style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.1em', borderRadius: '2px' }}
      >
        PASS
      </span>
    )
  }
  if (status === 'wont_fix') {
    return (
      <span
        className="inline-block font-sans text-xs font-bold tracking-widest uppercase px-2.5 py-0.5"
        style={{ background: '#5f5e5e', color: '#fff', letterSpacing: '0.1em', borderRadius: '2px' }}
      >
        N/A
      </span>
    )
  }
  return (
    <span
      className="inline-block font-sans text-xs font-bold tracking-widest uppercase px-2.5 py-0.5"
      style={{ background: '#610000', color: '#fff', letterSpacing: '0.1em', borderRadius: '2px' }}
    >
      FAIL
    </span>
  )
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

  // Shared button style for consistent sizing
  const btnBase: React.CSSProperties = {
    border: '1px solid #d0cac8',
    borderRadius: '4px',
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  }

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
        {/* Top row: badges left | criterion + actions right */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FailBadge status={finding.status} />
            {finding.wcagLevel && (
              <span
                className="font-sans text-xs font-semibold uppercase"
                style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}
              >
                Level {finding.wcagLevel}
              </span>
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

        {/* Footer: chips + actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid #f0ede9' }}>
          <div className="flex flex-wrap gap-1.5">
            {finding.pageUrl && (
              <span className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e', borderRadius: '3px' }}>
                {finding.pageUrl}
              </span>
            )}
            {finding.component && (
              <span className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e', borderRadius: '3px' }}>
                {finding.component}
              </span>
            )}
            {finding.standards?.map((s) => (
              <span key={s} className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e', borderRadius: '3px' }}>
                {s}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Status dropdown */}
            <Select value={finding.status || 'open'} onValueChange={handleStatusChange}>
              <SelectTrigger
                style={{ height: '32px', fontSize: '13px', width: '130px', fontFamily: 'inherit' }}
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

            {/* View Details */}
            <button
              onClick={onEdit}
              aria-label={`View details: ${finding.title}`}
              style={{ ...btnBase, color: '#2b2c2c', background: 'transparent' }}
            >
              <Eye style={{ width: '13px', height: '13px' }} aria-hidden="true" />
              View Details
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              aria-label={`Edit: ${finding.title}`}
              style={{ ...btnBase, color: '#5f5e5e', background: 'transparent' }}
            >
              <Pencil style={{ width: '13px', height: '13px' }} aria-hidden="true" />
              Edit
            </button>

            {/* Delete */}
            <button
              onClick={() => setDeleteOpen(true)}
              aria-label={`Delete: ${finding.title}`}
              style={{ ...btnBase, color: '#c0392b', background: 'transparent' }}
            >
              <Trash2 style={{ width: '13px', height: '13px' }} aria-hidden="true" />
              Delete
            </button>
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
            <button
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[#f6f3f2]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 font-sans text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#610000', borderRadius: '4px' }}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
