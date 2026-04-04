import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
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

const SEVERITY_VARIANTS = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor'
} as const

const STATUS_VARIANTS = {
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  wont_fix: 'wont_fix'
} as const

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  wont_fix: "Won't Fix"
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

  const severityVariant = SEVERITY_VARIANTS[finding.severity as keyof typeof SEVERITY_VARIANTS]
  const statusVariant = STATUS_VARIANTS[finding.status as keyof typeof STATUS_VARIANTS]

  return (
    <>
      <article
        className="border rounded-lg bg-card overflow-hidden"
        aria-label={finding.title}
      >
        {/* Row header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Expand toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={`finding-detail-${finding.id}`}
            aria-label={expanded ? 'Collapse finding' : 'Expand finding'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          {/* Severity badge */}
          <Badge
            variant={severityVariant || 'outline'}
            className="capitalize flex-shrink-0 text-xs"
          >
            {finding.severity || 'unknown'}
          </Badge>

          {/* Title */}
          <button
            className="flex-1 text-left text-sm font-medium hover:underline underline-offset-2 truncate"
            onClick={() => setExpanded(!expanded)}
          >
            {finding.title}
          </button>

          {/* WCAG criterion */}
          {finding.wcagCriterion && (
            <span className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
              WCAG {finding.wcagCriterion}
            </span>
          )}

          {/* Status inline select */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Select
              value={finding.status || 'open'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger
                className="h-7 text-xs w-28 border-0 bg-transparent focus:ring-0 px-2"
                aria-label="Finding status"
              >
                <Badge
                  variant={statusVariant || 'outline'}
                  className="text-xs"
                >
                  {STATUS_LABELS[finding.status || 'open'] || finding.status}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
              aria-label={`Edit finding: ${finding.title}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Delete finding: ${finding.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div
            id={`finding-detail-${finding.id}`}
            className="border-t px-4 py-3 space-y-3 bg-muted/30"
          >
            {finding.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Issue
                </p>
                <p className="text-sm text-foreground leading-relaxed">{finding.description}</p>
              </div>
            )}

            {finding.recommendations && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Recommendation
                </p>
                <p className="text-sm text-foreground leading-relaxed">{finding.recommendations}</p>
              </div>
            )}

            {finding.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm text-foreground leading-relaxed">{finding.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {finding.wcagLevel && (
                <Badge variant="outline" className="text-xs">
                  WCAG {finding.wcagLevel}
                </Badge>
              )}
              {finding.category && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {finding.category}
                </Badge>
              )}
              {finding.pageUrl && (
                <span className="text-xs text-muted-foreground truncate max-w-xs">
                  {finding.pageUrl}
                </span>
              )}
              {finding.standards?.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
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
