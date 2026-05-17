import { useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { EchoButton } from '../ui/echo-button'
import { EchoPill } from '../ui/echo-pill'
import { KVTag } from '../ui/kv-tag'
import { WCAG_CRITERIA, formatRelativeDate } from '../../lib/utils'
import type { Project } from '../../../db/schema'

interface ProjectWithCount extends Project {
  findingCount: number
}

interface ProjectCardProps {
  project: ProjectWithCount
  onClick: () => void
  onEdit: (project: ProjectWithCount) => void
  onDelete: (project: ProjectWithCount) => void
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  archived: 'Archived'
}

export function ProjectCard({ project, onClick, onEdit, onDelete }: ProjectCardProps) {
  const auditStats = useMemo(() => {
    try {
      const saved = localStorage.getItem(`echo-step-audit-${project.id}`)
      if (saved) {
        const v = JSON.parse(saved)?.criteriaVerdict ?? {}
        const pass = Object.values(v).filter((x) => x === 'pass').length
        const fail = Object.values(v).filter((x) => x === 'fail').length
        return { pass, fail, unknown: WCAG_CRITERIA.length - pass - fail }
      }
    } catch { /* ignore */ }
    return { pass: 0, fail: 0, unknown: WCAG_CRITERIA.length }
  }, [project.id])

  return (
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
      aria-label={`${project.name}${project.clientName ? `, client: ${project.clientName}` : ''}`}
    >
      {/* Top row: name + actions */}
      <div className="flex items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h2
            className="font-serif font-bold leading-tight mb-1"
            style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#1a1a1a' }}
          >
            {project.name}
          </h2>
          {project.clientName && (
            <p className="font-sans text-sm" style={{ color: '#5f5e5e' }}>{project.clientName}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <EchoButton
            icon={<Pencil className="h-3.5 w-3.5" />}
            iconPosition="left"
            onClick={(e) => { e.stopPropagation(); onEdit(project) }}
            aria-label={`Edit ${project.name}`}
            style={{ padding: '5px 10px', fontSize: '13px' }}
          >
            Edit
          </EchoButton>
          <EchoButton
            icon={<Trash2 className="h-3.5 w-3.5" />}
            iconPosition="left"
            onClick={(e) => { e.stopPropagation(); onDelete(project) }}
            aria-label={`Delete ${project.name}`}
            style={{ padding: '5px 10px', fontSize: '13px' }}
          >
            Delete
          </EchoButton>
        </div>
      </div>

      {project.description && (
        <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>{project.description}</p>
      )}

      {/* Bottom: status pill + 4 metrics + date */}
      <div className="flex items-center justify-between pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid #f0ede9' }}>
        <div className="flex items-center gap-2">
          <EchoPill variant="level" label={STATUS_LABELS[project.status] || project.status} />
          <span className="font-sans text-xs" style={{ color: '#b0aaa8' }}>
            {formatRelativeDate(project.updatedAt)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1">
            <KVTag label="Findings" value={String(project.findingCount)} />
            <KVTag label="Unknown" value={String(auditStats.unknown)} />
          </div>
          <div className="flex flex-col gap-1">
            <KVTag label="Passed" value={String(auditStats.pass)} valueVariant="pass" />
            <KVTag label="Failed" value={String(auditStats.fail)} valueVariant="fail" />
          </div>
        </div>
      </div>
    </article>
  )
}
