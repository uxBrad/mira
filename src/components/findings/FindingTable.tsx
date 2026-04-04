import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { FindingFormDialog } from './FindingFormDialog'
import { FindingRow } from './FindingRow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Label } from '../ui/label'

interface Finding {
  id: string
  projectId: string
  title: string
  description: string | null
  wcagCriterion: string | null
  wcagLevel: string | null
  standards: string[]
  category: string | null
  severity: string | null
  status: string | null
  pageUrl: string | null
  screenshotPath: string | null
  recommendations: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

interface FindingTableProps {
  findings: Finding[]
  isLoading: boolean
  projectId: string
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
}

export function FindingTable({ findings, isLoading, projectId, onUpdate, onDelete }: FindingTableProps) {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editFinding, setEditFinding] = useState<Finding | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading findings">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl">
        <p className="text-muted-foreground text-sm mb-1">No findings yet</p>
        <p className="text-xs text-muted-foreground">
          Click &ldquo;Add finding&rdquo; to log an accessibility issue.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length === findings.length
            ? `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${findings.length} findings`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="findings-filters"
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {(severityFilter !== 'all' || statusFilter !== 'all') && (
            <Badge variant="default" className="ml-1 h-4 px-1.5 text-xs">
              {[severityFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {showFilters && (
        <div
          id="findings-filters"
          className="flex gap-4 mb-4 p-3 border rounded-lg bg-muted/50 flex-wrap"
        >
          <div className="space-y-1">
            <Label htmlFor="filter-severity" className="text-xs">Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger id="filter-severity" className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="serious">Serious</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="filter-status" className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="filter-status" className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(severityFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="self-end text-xs"
              onClick={() => {
                setSeverityFilter('all')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Findings list */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">
          No findings match the current filters.
        </p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Findings">
          {filtered.map((finding) => (
            <li key={finding.id}>
              <FindingRow
                finding={finding}
                onEdit={() => setEditFinding(finding)}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Edit dialog */}
      {editFinding && (
        <FindingFormDialog
          open={!!editFinding}
          onOpenChange={(open) => { if (!open) setEditFinding(null) }}
          onSubmit={async (data) => {
            await onUpdate(editFinding.id, data as unknown as Record<string, unknown>)
            setEditFinding(null)
          }}
          mode="edit"
          projectId={projectId}
          initialData={{
            ...editFinding,
            description: editFinding.description ?? undefined,
            wcagCriterion: editFinding.wcagCriterion ?? undefined,
            wcagLevel: editFinding.wcagLevel ?? undefined,
            category: editFinding.category ?? undefined,
            severity: editFinding.severity ?? undefined,
            status: editFinding.status ?? undefined,
            pageUrl: editFinding.pageUrl ?? undefined,
            screenshotPath: editFinding.screenshotPath ?? undefined,
            recommendations: editFinding.recommendations ?? undefined,
            notes: editFinding.notes ?? undefined
          }}
        />
      )}
    </div>
  )
}
