import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Download,
  ExternalLink,
  AlertCircle,
  Eye,
  MousePointer,
  BookOpen,
  Shield,
  LayoutGrid,
  Settings2,
  ListChecks,
  Upload,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useFindings } from '../../hooks/useFindings'
import { useTemplates } from '../../hooks/useTemplates'
import { FindingTable } from '../../components/findings/FindingTable'
import { FindingFormSidebar } from '../../components/findings/FindingFormSidebar'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { StepAuditPanel } from '../../components/audit/StepAuditPanel'
import { ImportFindingsDialog } from '../../components/findings/ImportFindingsDialog'
import { useToast } from '../../components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'


interface Project {
  id: string
  name: string
  clientName: string | null
  url: string | null
  description: string | null
  status: string
  standards: string | null
  auditUrls: string[]
  components: string[]
  createdAt: number
  updatedAt: number
}

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
  component: string | null
  screenshotPath: string | null
  recommendations: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: { key: string; label: string }[]
  selected: string[]
  onToggle: (key: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedLabels = options.filter(o => selected.includes(o.key)).map(o => o.label)
  const active = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 whitespace-nowrap transition-colors"
        style={{
          border: `1px solid ${active ? '#610000' : '#d0cac8'}`,
          background: active ? '#610000' : 'transparent',
          color: active ? '#fff' : '#2b2c2c',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>
          {label}
          {active && `: ${selectedLabels.slice(0, 2).join(', ')}${selectedLabels.length > 2 ? ` +${selectedLabels.length - 2}` : ''}`}
        </span>
        {active && (
          <span
            role="button"
            aria-label={`Clear ${label} filter`}
            onClick={e => { e.stopPropagation(); onClear() }}
            className="ml-0.5 leading-none hover:opacity-80"
          >
            ×
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[180px] py-1"
          style={{ background: '#fff', border: '1px solid #e0dbd9', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '4px' }}
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map(o => {
            const checked = selected.includes(o.key)
            return (
              <button
                key={o.key}
                onClick={() => onToggle(o.key)}
                className="flex items-center gap-2.5 w-full px-3 py-2 font-sans text-sm text-left transition-colors hover:bg-[#f6f3f2]"
                style={{ color: '#2b2c2c' }}
                role="option"
                aria-selected={checked}
              >
                <span
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                  style={{
                    border: `1.5px solid ${checked ? '#610000' : '#d0cac8'}`,
                    background: checked ? '#610000' : 'transparent',
                    borderRadius: '2px',
                  }}
                >
                  {checked && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFinding, setEditFinding] = useState<Finding | null>(null)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)
  const [showFormatDialog, setShowFormatDialog] = useState(false)
  const [principleFilter, setPrincipleFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [pageFilter, setPageFilter] = useState<string[]>([])
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [findingInitialData, setFindingInitialData] = useState<Partial<{title:string;description:string;wcagCriterion:string;wcagLevel:string;standards:string[];category:string;severity:string;status:string;pageUrl:string;component:string;screenshotPath:string;recommendations:string;notes:string}> | undefined>(undefined)
  const [stepAuditOpen, setStepAuditOpen] = useState(false)
  const [stepAuditMounted, setStepAuditMounted] = useState(false)
  const [stepAuditWide, setStepAuditWide] = useState(false)
  const [findingSidebarMounted, setFindingSidebarMounted] = useState(false)
  const [findingSidebarWide, setFindingSidebarWide] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)

  // Modal manage pages / components
  const [pageModalOpen, setPageModalOpen] = useState(false)
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [newPageValue, setNewPageValue] = useState('')
  const [newComponentValue, setNewComponentValue] = useState('')
  const [renamingPage, setRenamingPage] = useState<string | null>(null)
  const [renamePageValue, setRenamePageValue] = useState('')
  const [renamingComponent, setRenamingComponent] = useState<string | null>(null)
  const [renameComponentValue, setRenameComponentValue] = useState('')

  const { findings, isLoading, error, reload, createFinding, updateFinding, deleteFinding } = useFindings(id!)
  const { templates } = useTemplates()

  useEffect(() => {
    if (!id) return
    window.api.projects
      .get(id)
      .then((p) => setProject(p as Project))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setIsLoadingProject(false))
  }, [id, navigate])


  // Derived filter options from findings
  const uniquePages = Array.from(
    new Set(findings.map((f) => f.pageUrl).filter((p): p is string => !!p))
  )
  const uniqueComponents = Array.from(
    new Set(findings.map((f) => f.component).filter((c): c is string => !!c))
  )

  const filtered = findings.filter((f) => {
    if (principleFilter !== 'all') {
      const prefix = f.wcagCriterion?.split('.')[0]
      if (prefix !== principleFilter) return false
    }
    if (severityFilter.length > 0 && !severityFilter.includes(f.severity ?? '')) return false
    if (statusFilter.length > 0 && !statusFilter.includes(f.status ?? '')) return false
    if (pageFilter.length > 0 && !pageFilter.includes(f.pageUrl ?? '')) return false
    if (componentFilter.length > 0 && !componentFilter.includes(f.component ?? '')) return false
    return true
  })

  const activeFilterCount =
    (principleFilter !== 'all' ? 1 : 0) +
    severityFilter.length + statusFilter.length + pageFilter.length + componentFilter.length

  function toggleFilter(
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

  function openBlankFinding() {
    setFindingInitialData(undefined)
    setEditFinding(null)
    setCreateOpen(true)
  }


  async function handleCreateFinding(data: Parameters<typeof createFinding>[0]) {
    await createFinding(data)
    setCreateOpen(false)
    setFindingInitialData(undefined)
    toast({ title: 'Finding added' })
  }

  async function handleEditFinding(data: Parameters<typeof createFinding>[0]) {
    if (!editFinding) return
    await updateFinding(editFinding.id, data as unknown as Record<string, unknown>)
    setEditFinding(null)
    toast({ title: 'Finding updated' })
  }

  async function handleUpdateProject(data: {
    name?: string
    clientName?: string
    url?: string
    description?: string
    status?: string
    standards?: string
    auditUrls?: string[]
    components?: string[]
  }) {
    if (!id) return
    const updated = await window.api.projects.update(id, data)
    setProject(updated as Project)
    setEditProjectOpen(false)
    toast({ title: 'Project updated' })
  }

  async function handleAddPage(page: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      auditUrls: [...project.auditUrls, page]
    })
    setProject(updated as Project)
  }

  async function handleAddComponent(component: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      components: [...project.components, component]
    })
    setProject(updated as Project)
  }

  async function confirmAddPage() {
    const trimmed = newPageValue.trim()
    if (!trimmed || !project) return
    if (!project.auditUrls.includes(trimmed)) {
      await handleAddPage(trimmed)
    }
    setNewPageValue('')
  }

  async function confirmAddComponent() {
    const trimmed = newComponentValue.trim()
    if (!trimmed || !project) return
    if (!project.components.includes(trimmed)) {
      await handleAddComponent(trimmed)
    }
    setNewComponentValue('')
  }

  async function handleDeletePage(page: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      auditUrls: project.auditUrls.filter((p) => p !== page)
    })
    setProject(updated as Project)
  }

  async function handleRenamePage(oldPage: string, newPage: string) {
    const trimmed = newPage.trim()
    if (!trimmed || !project || !id) return
    const updated = await window.api.projects.update(id, {
      auditUrls: project.auditUrls.map((p) => (p === oldPage ? trimmed : p))
    })
    setProject(updated as Project)
    setRenamingPage(null)
    setRenamePageValue('')
  }

  async function handleDeleteComponent(component: string) {
    if (!project || !id) return
    const updated = await window.api.projects.update(id, {
      components: project.components.filter((c) => c !== component)
    })
    setProject(updated as Project)
  }

  async function handleRenameComponent(oldComp: string, newComp: string) {
    const trimmed = newComp.trim()
    if (!trimmed || !project || !id) return
    const updated = await window.api.projects.update(id, {
      components: project.components.map((c) => (c === oldComp ? trimmed : c))
    })
    setProject(updated as Project)
    setRenamingComponent(null)
    setRenameComponentValue('')
  }

  async function handleExportPDF(format: 'summary' | 'vpat' = 'summary') {
    setIsExporting('pdf')
    setShowFormatDialog(false)
    try {
      const result = await window.api.export.pdf(id!, format)
      if (!result.canceled) {
        toast({ title: 'PDF exported', description: `${format === 'vpat' ? 'VPAT' : 'Summary'} report saved to ${result.path}` })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not generate PDF.'
      })
    } finally {
      setIsExporting(null)
    }
  }

  function handleClickExportPDF() {
    setShowFormatDialog(true)
  }

  async function handleExportCSV() {
    setIsExporting('csv')
    try {
      const result = await window.api.export.csv(id!)
      if (!result.canceled) {
        toast({ title: 'CSV exported', description: `Saved to ${result.path}` })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not export CSV.'
      })
    } finally {
      setIsExporting(null)
    }
  }

  // Enable layout transitions only after the project data has loaded and the
  // full layout has painted for the first time. Using rAF on mount is too early
  // because it fires during the loading-spinner phase — by the time the real
  // layout renders, layoutReady is already true and transitions fire immediately.
  useEffect(() => {
    if (isLoadingProject) return
    // Project just became available — hold off transitions for one frame so the
    // layout can render at its final resting position before we enable animation.
    setLayoutReady(false)
    const rafId = requestAnimationFrame(() => setLayoutReady(true))
    return () => cancelAnimationFrame(rafId)
  }, [isLoadingProject])

  // Keep step audit mounted once opened so state is preserved and transitions work
  useEffect(() => {
    if (stepAuditOpen) setStepAuditMounted(true)
  }, [stepAuditOpen])

  const sidebarOpen = createOpen || !!editFinding

  // Keep finding sidebar mounted once opened (state + transitions)
  useEffect(() => {
    if (sidebarOpen) setFindingSidebarMounted(true)
  }, [sidebarOpen])

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="Loading project">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  const resolvedCount = findings.filter((f) => f.status === 'resolved').length
  const complianceScore = findings.length > 0 ? Math.round((resolvedCount / findings.length) * 100) : 0

  const PRINCIPLES = [
    { key: 'all', label: 'All', icon: LayoutGrid },
    { key: '1', label: 'Perceivable', icon: Eye },
    { key: '2', label: 'Operable', icon: MousePointer },
    { key: '3', label: 'Understandable', icon: BookOpen },
    { key: '4', label: 'Robust', icon: Shield },
  ]

  const anySidebarOpen = sidebarOpen || stepAuditOpen
  const tr = layoutReady ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
  const toolkitWidth = `calc(18rem + 100px)`

  // Main column width
  const mainWidth = sidebarOpen
    ? (findingSidebarWide ? '0%' : '50%')
    : stepAuditOpen
      ? (stepAuditWide ? '0%' : '50%')
      : `calc(100% - ${toolkitWidth})`

  // Right-side inner radius when a panel is open beside main
  const mainInnerRadius = anySidebarOpen ? '0 10px 10px 0' : '0'

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{
        gap: anySidebarOpen ? '4px' : '0',
        background: '#d8d3d1',
        transition: tr,
        paddingTop: anySidebarOpen ? '10px' : '0',
        paddingBottom: anySidebarOpen ? '10px' : '0',
        paddingLeft: '0',
        paddingRight: anySidebarOpen ? '10px' : '0',
      }}
    >

      {/* ── Main column ── */}
      <div
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          width: mainWidth,
          transition: tr,
          borderRadius: mainInnerRadius,
          background: '#fcf9f8',
          overflow: 'hidden',
        }}
      >

        {/* Project header */}
        <div className="flex-shrink-0 px-10 pt-8 pb-0" style={{ background: '#fcf9f8' }}>
          {/* Standards label */}
          {project.standards && (
            <p
              className="font-sans text-xs font-bold uppercase mb-3"
              style={{ color: '#610000', letterSpacing: '0.12em' }}
            >
              {project.standards} Audit
            </p>
          )}

          {/* Project name — large serif */}
          <h1
            className="font-serif font-bold leading-none mb-1"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}
          >
            {project.name}
          </h1>

          {/* Client + URL */}
          <div className="flex items-center gap-3 mt-2 mb-5 flex-wrap">
            {project.clientName && (
              <span className="font-sans text-sm" style={{ color: '#5f5e5e' }}>{project.clientName}</span>
            )}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-sans text-xs hover:underline"
                style={{ color: '#5f5e5e' }}
              >
                {project.url}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: '#e0dbd9', marginBottom: 0 }} />

          {/* WCAG Principle tabs */}
          <div
            className="flex items-center gap-0 -mb-px overflow-x-auto"
            role="tablist"
            aria-label="Filter by WCAG principle"
            style={{ scrollbarWidth: 'none' }}
          >
            {PRINCIPLES.map(({ key, label, icon: Icon }) => {
              const active = principleFilter === key
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPrincipleFilter(key)}
                  className="flex items-center gap-1.5 px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap flex-shrink-0"
                  style={{
                    letterSpacing: '0.1em',
                    background: active ? '#610000' : 'transparent',
                    color: active ? '#ffffff' : '#5f5e5e',
                    borderBottom: active ? 'none' : '2px solid transparent',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Findings list */}
        <main id="main-findings" className="flex-1 overflow-y-auto px-10 py-6">

          {/* Secondary filters row — Jira-style multiselect */}
          {findings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <MultiSelectFilter
                label="Severity"
                options={[
                  { key: 'critical', label: 'Critical' },
                  { key: 'serious', label: 'Serious' },
                  { key: 'moderate', label: 'Moderate' },
                  { key: 'minor', label: 'Minor' },
                ]}
                selected={severityFilter}
                onToggle={v => toggleFilter(v, severityFilter, setSeverityFilter)}
                onClear={() => setSeverityFilter([])}
              />
              <MultiSelectFilter
                label="Status"
                options={[
                  { key: 'open', label: 'Open' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'resolved', label: 'Resolved' },
                  { key: 'wont_fix', label: "Won't Fix" },
                ]}
                selected={statusFilter}
                onToggle={v => toggleFilter(v, statusFilter, setStatusFilter)}
                onClear={() => setStatusFilter([])}
              />
              {uniquePages.length > 0 && (
                <MultiSelectFilter
                  label="Pages"
                  options={uniquePages.map(p => ({ key: p, label: p }))}
                  selected={pageFilter}
                  onToggle={v => toggleFilter(v, pageFilter, setPageFilter)}
                  onClear={() => setPageFilter([])}
                />
              )}
              {uniqueComponents.length > 0 && (
                <MultiSelectFilter
                  label="Components"
                  options={uniqueComponents.map(c => ({ key: c, label: c }))}
                  selected={componentFilter}
                  onToggle={v => toggleFilter(v, componentFilter, setComponentFilter)}
                  onClear={() => setComponentFilter([])}
                />
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setPrincipleFilter('all')
                    setSeverityFilter([])
                    setStatusFilter([])
                    setPageFilter([])
                    setComponentFilter([])
                  }}
                  className="font-sans text-xs underline underline-offset-2"
                  style={{ color: '#610000' }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-primary px-4 py-3 mb-5"
              style={{ background: '#f0ede9' }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-sans text-sm">{error}</p>
            </div>
          )}

          {!isLoading && findings.length > 0 && (
            <p className="font-sans text-xs mb-2" style={{ color: '#5f5e5e' }}>
              {filtered.length === findings.length
                ? `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${findings.length} findings`}
            </p>
          )}

          {!isLoading && findings.length === 0 && !error && (
            <div className="py-24 text-center">
              <h2 className="font-serif font-bold text-2xl mb-2">No findings yet</h2>
              <p className="font-sans text-sm mb-8 max-w-xs mx-auto" style={{ color: '#5f5e5e' }}>
                Click &ldquo;Add finding&rdquo; in the Audit Toolkit to log your first accessibility issue.
              </p>
            </div>
          )}

          <FindingTable
            findings={filtered}
            isLoading={isLoading}
            onEdit={(f) => setEditFinding(f as Finding)}
            onUpdate={updateFinding}
            onDelete={deleteFinding}
          />
        </main>
      </div>

      {/* ── Finding Form Sidebar — in-layout, same pattern as StepAuditPanel ── */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: sidebarOpen ? (findingSidebarWide ? '100%' : '50%') : '0',
          transition: tr,
          borderRadius: sidebarOpen ? '10px 0 0 10px' : '0',
          overflow: 'hidden',
        }}
        aria-hidden={!sidebarOpen}
      >
        {findingSidebarMounted && (
          <FindingFormSidebar
            open={sidebarOpen}
            onClose={() => { setCreateOpen(false); setEditFinding(null); setFindingInitialData(undefined); setFindingSidebarWide(false) }}
            onSubmit={editFinding ? handleEditFinding : handleCreateFinding}
            mode={editFinding ? 'edit' : 'create'}
            projectId={id!}
            auditPages={project.auditUrls}
            auditComponents={project.components}
            onAddPage={handleAddPage}
            onAddComponent={handleAddComponent}
            templates={templates}
            initialData={editFinding ? {
              title: editFinding.title,
              description: editFinding.description ?? undefined,
              wcagCriterion: editFinding.wcagCriterion ?? undefined,
              wcagLevel: editFinding.wcagLevel ?? undefined,
              standards: editFinding.standards,
              category: editFinding.category ?? undefined,
              severity: editFinding.severity ?? undefined,
              status: editFinding.status ?? undefined,
              pageUrl: editFinding.pageUrl ?? undefined,
              component: editFinding.component ?? undefined,
              screenshotPath: editFinding.screenshotPath ?? undefined,
              recommendations: editFinding.recommendations ?? undefined,
              notes: editFinding.notes ?? undefined
            } : findingInitialData}
            isWide={findingSidebarWide}
            onToggleWide={() => setFindingSidebarWide(w => !w)}
          />
        )}
      </div>

      {/* ── Step-by-Step Audit Panel ── */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: stepAuditOpen ? (stepAuditWide ? '100%' : '50%') : '0',
          transition: tr,
          borderRadius: stepAuditOpen ? '10px 0 0 10px' : '0',
          overflow: 'hidden',
        }}
        aria-hidden={!stepAuditOpen}
      >
        {stepAuditMounted && (
          <StepAuditPanel
            onClose={() => { setStepAuditOpen(false); setStepAuditWide(false) }}
            isWide={stepAuditWide}
            onToggleWide={() => setStepAuditWide(w => !w)}
            projectId={id!}
            auditPages={project.auditUrls}
            auditComponents={project.components}
            findings={findings}
            templates={templates}
            onAddFinding={async (data) => {
              await createFinding(data)
              toast({ title: 'Finding logged' })
            }}
          />
        )}
      </div>

      {/* ── Right sidebar: Audit Toolkit ── */}
      <aside
        className="flex-shrink-0 overflow-hidden"
        style={{
          width: anySidebarOpen ? '0' : toolkitWidth,
          transition: tr,
          background: '#f6f3f2',
          borderLeft: '1px solid #e0dbd9',
        }}
        aria-label="Audit toolkit"
        aria-hidden={anySidebarOpen}
      >
        {/* Fixed-width inner prevents content reflow during the width transition */}
        <div className="flex flex-col h-full overflow-y-auto" style={{ width: toolkitWidth }}>
        <div className="px-6 pt-8 pb-6">
          <h2 className="font-serif font-bold text-xl mb-1" style={{ letterSpacing: '-0.01em' }}>
            Audit Toolkit
          </h2>
          <p className="font-sans text-xs leading-relaxed mb-6" style={{ color: '#5f5e5e' }}>
            Precision tools for modern accessibility compliance workflows.
          </p>

          {/* Primary: Add Finding */}
          <button
            className="flex w-full items-center justify-between px-4 py-3 mb-2 font-sans text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ background: '#610000', letterSpacing: '0.1em' }}
            onClick={openBlankFinding}
          >
            <span>Add Finding</span>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Secondary: Step-by-Step Audit */}
          <button
            className="flex w-full items-center justify-between px-4 py-3 mb-2 font-sans text-sm font-bold uppercase tracking-widest transition-colors hover:bg-[#e0dbd9]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
            onClick={() => setStepAuditOpen(true)}
          >
            <span>Step-by-Step Audit</span>
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* View Report */}
          <button
            className="flex w-full items-center justify-between px-4 py-3 mb-4 font-sans text-sm font-bold uppercase tracking-widest transition-colors hover:bg-[#e0dbd9]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
            onClick={() => navigate(`/project/${id}/report`)}
          >
            <span>View Report</span>
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Tertiary buttons */}
          <div className="space-y-2">
            {/* Pages */}
            <button
              onClick={() => setPageModalOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Pages
              </span>
              <span
                className="flex items-center justify-center font-sans text-xs font-bold text-white"
                style={{ background: '#610000', borderRadius: '9999px', minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {project.auditUrls.length}
              </span>
            </button>

            {/* Components */}
            <button
              onClick={() => setComponentModalOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Components
              </span>
              <span
                className="flex items-center justify-center font-sans text-xs font-bold text-white"
                style={{ background: '#610000', borderRadius: '9999px', minWidth: '20px', height: '20px', padding: '0 5px' }}
              >
                {project.components.length}
              </span>
            </button>

            {/* Import Report */}
            <button
              onClick={() => setImportOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Import Report
              </span>
            </button>

            {/* Configure Project */}
            <button
              onClick={() => setEditProjectOpen(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                Configure Project
              </span>
            </button>
          </div>

          {/* Export PDF */}
          <button
            onClick={handleClickExportPDF}
            disabled={!!isExporting}
            aria-busy={isExporting === 'pdf'}
            className="flex w-full items-center justify-between px-4 py-3 mt-4 font-sans text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 hover:bg-[#d8d4d2]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
          >
            <span>{isExporting === 'pdf' ? 'Generating…' : 'Export Report (PDF)'}</span>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!!isExporting || findings.length === 0}
            aria-busy={isExporting === 'csv'}
            className="flex w-full items-center justify-between px-4 py-3 mt-1 font-sans text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 hover:bg-[#d8d4d2]"
            style={{ background: '#e5e2e1', color: '#2b2c2c', letterSpacing: '0.1em' }}
          >
            <span>{isExporting === 'csv' ? 'Exporting…' : 'Export CSV'}</span>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Masthead divider */}
        <div style={{ height: '12px', background: '#e5e2e1' }} aria-hidden="true" />

        {/* Project Statistics */}
        <div className="px-6 py-6">
          <p className="font-sans text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#5f5e5e', letterSpacing: '0.12em' }}>
            Project Statistics
          </p>
          <dl className="space-y-5">
            <div>
              <dt className="font-sans text-xs mb-1" style={{ color: '#5f5e5e' }}>Compliance Score</dt>
              <dd className="font-serif font-bold" style={{ fontSize: '2.5rem', color: '#1a1a1a', lineHeight: 1 }}>
                {complianceScore}%
              </dd>
              <div className="mt-2 h-1.5" style={{ background: '#e0dbd9' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${complianceScore}%`, background: complianceScore >= 80 ? '#2d7a4f' : complianceScore >= 50 ? '#8b6914' : '#610000' }}
                />
              </div>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Total findings</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#1a1a1a' }}>{findings.length}</dd>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Open</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#610000' }}>
                {findings.filter((f) => f.status === 'open').length}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs mb-0.5" style={{ color: '#5f5e5e' }}>Resolved</dt>
              <dd className="font-serif font-bold text-2xl" style={{ color: '#2d7a4f' }}>{resolvedCount}</dd>
            </div>
          </dl>
        </div>
        </div>{/* end fixed-width inner */}
      </aside>

      {/* ── Manage Pages modal ── */}
      <Dialog open={pageModalOpen} onOpenChange={(o) => { setPageModalOpen(o); if (!o) { setNewPageValue(''); setRenamingPage(null); setRenamePageValue('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Pages</DialogTitle>
            <DialogDescription>Add, rename, or remove pages tracked in this audit.</DialogDescription>
          </DialogHeader>

          {/* Existing pages list */}
          {project.auditUrls.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {project.auditUrls.map((page) => (
                <div key={page} className="flex items-center gap-2 px-3 py-2" style={{ background: '#f6f3f2', borderRadius: '4px' }}>
                  {renamingPage === page ? (
                    <>
                      <input
                        autoFocus
                        value={renamePageValue}
                        onChange={(e) => setRenamePageValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenamePage(page, renamePageValue)
                          if (e.key === 'Escape') { setRenamingPage(null); setRenamePageValue('') }
                        }}
                        className="flex-1 h-8 px-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        style={{ borderColor: '#d0cac8' }}
                      />
                      <button
                        onClick={() => handleRenamePage(page, renamePageValue)}
                        disabled={!renamePageValue.trim()}
                        className="px-2.5 py-1 font-sans text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: '#610000', borderRadius: '3px' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setRenamingPage(null); setRenamePageValue('') }}
                        className="px-2.5 py-1 font-sans text-xs font-medium"
                        style={{ border: '1px solid #d0cac8', color: '#2b2c2c', borderRadius: '3px' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-sans text-sm truncate" style={{ color: '#2b2c2c' }}>{page}</span>
                      <button
                        onClick={() => { setRenamingPage(page); setRenamePageValue(page) }}
                        className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-[#ede9e7] transition-colors"
                        style={{ border: '1px solid #d0cac8', color: '#2b2c2c', borderRadius: '3px' }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeletePage(page)}
                        className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-red-50 transition-colors"
                        style={{ border: '1px solid #d0cac8', color: '#c0392b', borderRadius: '3px' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new page */}
          <div className="flex gap-2 mt-2">
            <input
              value={newPageValue}
              onChange={(e) => setNewPageValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmAddPage() }}
              placeholder="/about or Home"
              className="flex-1 h-9 px-3 font-sans text-sm border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ borderColor: '#d0cac8' }}
            />
            <button
              onClick={confirmAddPage}
              disabled={!newPageValue.trim()}
              className="px-4 py-2 font-sans text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#610000', borderRadius: '4px' }}
            >
              Add
            </button>
          </div>

          <DialogFooter>
            <button
              onClick={() => setPageModalOpen(false)}
              className="px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Components modal ── */}
      <Dialog open={componentModalOpen} onOpenChange={(o) => { setComponentModalOpen(o); if (!o) { setNewComponentValue(''); setRenamingComponent(null); setRenameComponentValue('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Components</DialogTitle>
            <DialogDescription>Add, rename, or remove components tracked in this audit.</DialogDescription>
          </DialogHeader>

          {/* Existing components list */}
          {project.components.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {project.components.map((comp) => (
                <div key={comp} className="flex items-center gap-2 px-3 py-2" style={{ background: '#f6f3f2', borderRadius: '4px' }}>
                  {renamingComponent === comp ? (
                    <>
                      <input
                        autoFocus
                        value={renameComponentValue}
                        onChange={(e) => setRenameComponentValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameComponent(comp, renameComponentValue)
                          if (e.key === 'Escape') { setRenamingComponent(null); setRenameComponentValue('') }
                        }}
                        className="flex-1 h-8 px-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        style={{ borderColor: '#d0cac8' }}
                      />
                      <button
                        onClick={() => handleRenameComponent(comp, renameComponentValue)}
                        disabled={!renameComponentValue.trim()}
                        className="px-2.5 py-1 font-sans text-xs font-bold text-white disabled:opacity-40"
                        style={{ background: '#610000', borderRadius: '3px' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setRenamingComponent(null); setRenameComponentValue('') }}
                        className="px-2.5 py-1 font-sans text-xs font-medium"
                        style={{ border: '1px solid #d0cac8', color: '#2b2c2c', borderRadius: '3px' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-sans text-sm truncate" style={{ color: '#2b2c2c' }}>{comp}</span>
                      <button
                        onClick={() => { setRenamingComponent(comp); setRenameComponentValue(comp) }}
                        className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-[#ede9e7] transition-colors"
                        style={{ border: '1px solid #d0cac8', color: '#2b2c2c', borderRadius: '3px' }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteComponent(comp)}
                        className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-red-50 transition-colors"
                        style={{ border: '1px solid #d0cac8', color: '#c0392b', borderRadius: '3px' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new component */}
          <div className="flex gap-2 mt-2">
            <input
              value={newComponentValue}
              onChange={(e) => setNewComponentValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmAddComponent() }}
              placeholder="Navigation, Hero, Footer…"
              className="flex-1 h-9 px-3 font-sans text-sm border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ borderColor: '#d0cac8' }}
            />
            <button
              onClick={confirmAddComponent}
              disabled={!newComponentValue.trim()}
              className="px-4 py-2 font-sans text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#610000', borderRadius: '4px' }}
            >
              Add
            </button>
          </div>

          <DialogFooter>
            <button
              onClick={() => setComponentModalOpen(false)}
              className="px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Configure Project modal ── */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ maxHeight: '90vh' }}>
          <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <ProjectFormDialog
              open={editProjectOpen}
              onOpenChange={setEditProjectOpen}
              onSubmit={handleUpdateProject}
              mode="edit"
              initialData={{
                name: project.name,
                clientName: project.clientName ?? undefined,
                url: project.url ?? undefined,
                description: project.description ?? undefined,
                status: project.status,
                standards: project.standards ?? undefined,
                auditUrls: project.auditUrls,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Findings modal ── */}
      {id && (
        <>
          <ImportFindingsDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            projectId={id}
            onImported={() => {
              reload()
              toast({ title: 'Findings imported', description: 'The findings have been added to your project.' })
            }}
          />

          {/* Format selection dialog */}
          <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Report Format</DialogTitle>
                <DialogDescription>
                  Select the format for your accessibility report export.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <button
                  onClick={() => handleExportPDF('summary')}
                  disabled={!!isExporting}
                  className="w-full flex flex-col items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                  style={{ borderColor: '#e0dbd9' }}
                >
                  <span className="font-semibold" style={{ color: '#610000' }}>Summary Report</span>
                  <span className="text-xs text-gray-600 mt-1">Executive overview with findings grouped by severity</span>
                </button>
                <button
                  onClick={() => handleExportPDF('vpat')}
                  disabled={!!isExporting}
                  className="w-full flex flex-col items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                  style={{ borderColor: '#e0dbd9' }}
                >
                  <span className="font-semibold" style={{ color: '#610000' }}>VPAT Report</span>
                  <span className="text-xs text-gray-600 mt-1">Voluntary Product Accessibility Template with criterion-by-criterion assessment</span>
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

