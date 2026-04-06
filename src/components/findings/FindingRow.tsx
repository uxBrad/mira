import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'
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
        style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.1em' }}
      >
        PASS
      </span>
    )
  }
  if (status === 'wont_fix') {
    return (
      <span
        className="inline-block font-sans text-xs font-bold tracking-widest uppercase px-2.5 py-0.5"
        style={{ background: '#5f5e5e', color: '#fff', letterSpacing: '0.1em' }}
      >
        N/A
      </span>
    )
  }
  return (
    <span
      className="inline-block font-sans text-xs font-bold tracking-widest uppercase px-2.5 py-0.5"
      style={{ background: '#610000', color: '#fff', letterSpacing: '0.1em' }}
    >
      FAIL
    </span>
  )
}

export function FindingRow({ finding, onEdit, onUpdate, onDelete }: FindingRowProps) {
  const [expanded, setExpanded] = useState(false)
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
        className="py-6"
        style={{ borderBottom: '1px solid #ebe7e7' }}
        aria-label={finding.title}
      >
        {/* Meta row: FAIL badge + level + severity | criterion right */}
        <div className="flex items-center justify-between mb-2 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FailBadge status={finding.status} />
            {finding.wcagLevel && (
              <span
                className="font-sans text-xs font-semibold tracking-widest uppercase"
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

            {/* Actions */}
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#5f5e5e] hover:text-foreground"
                onClick={onEdit}
                aria-label={`Edit: ${finding.title}`}
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#5f5e5e] hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                aria-label={`Delete: ${finding.title}`}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#5f5e5e] hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded
                  ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-serif font-bold leading-snug mb-2 cursor-pointer hover:text-primary transition-colors"
          style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
          onClick={() => setExpanded(!expanded)}
        >
          {finding.title}
        </h3>

        {/* Description preview */}
        {finding.description && !expanded && (
          <p
            className="font-sans text-sm leading-relaxed line-clamp-2"
            style={{ color: '#5f5e5e' }}
          >
            {finding.description}
          </p>
        )}

        {/* Page / component chips */}
        {(finding.pageUrl || finding.component) && !expanded && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {finding.pageUrl && (
              <span
                className="font-sans text-xs px-2 py-0.5"
                style={{ background: '#f6f3f2', color: '#5f5e5e' }}
              >
                {finding.pageUrl}
              </span>
            )}
            {finding.component && (
              <span
                className="font-sans text-xs px-2 py-0.5"
                style={{ background: '#f6f3f2', color: '#5f5e5e' }}
              >
                {finding.component}
              </span>
            )}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div
            id={`finding-detail-${finding.id}`}
            className="mt-4 space-y-4"
          >
            {finding.description && (
              <div>
                <p className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
                  Issue
                </p>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#2b2c2c' }}>
                  {finding.description}
                </p>
              </div>
            )}

            {finding.recommendations && (
              <div style={{ borderLeft: '3px solid #610000', paddingLeft: '12px' }}>
                <p className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#610000', letterSpacing: '0.1em' }}>
                  Recommendation
                </p>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#2b2c2c' }}>
                  {finding.recommendations}
                </p>
              </div>
            )}

            {finding.notes && (
              <p className="font-sans text-xs italic" style={{ color: '#5f5e5e' }}>
                Note: {finding.notes}
              </p>
            )}

            {/* Meta chips + status selector */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {finding.pageUrl && (
                  <span className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e' }}>
                    {finding.pageUrl}
                  </span>
                )}
                {finding.component && (
                  <span className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e' }}>
                    {finding.component}
                  </span>
                )}
                {finding.standards?.map((s) => (
                  <span key={s} className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e' }}>
                    {s}
                  </span>
                ))}
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={finding.status || 'open'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger
                    className="h-7 text-xs w-32 font-sans"
                    aria-label="Finding status"
                  >
                    <span>{STATUS_LABELS[finding.status || 'open'] || finding.status}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
