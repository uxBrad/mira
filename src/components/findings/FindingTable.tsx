import { FindingRow } from './FindingRow'

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
  onEdit: (finding: Finding) => void
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
}

export function FindingTable({ findings, isLoading, onEdit, onUpdate, onDelete }: FindingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-px" aria-busy="true" aria-label="Loading findings">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse" style={{ background: '#ebe7e7' }} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-data text-sm text-muted-foreground mb-1">No findings match the current filters.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-0" role="list" aria-label="Findings" style={{ paddingBottom: '2rem' }}>
      {findings.map((finding) => (
        <li key={finding.id}>
          <FindingRow
            finding={finding}
            onEdit={() => onEdit(finding)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  )
}
