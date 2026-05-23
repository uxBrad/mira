import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus,
  Download,
  ExternalLink,
  AlertCircle,
  Settings2,
  ListChecks,
  Upload,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react'
import { useFindings } from '../../hooks/useFindings'
import { useTemplates } from '../../hooks/useTemplates'
import { FindingTable } from '../../components/findings/FindingTable'
import { FindingRow } from '../../components/findings/FindingRow'
import { WCAG_CRITERIA } from '../../lib/utils'
import { FindingFormSidebar } from '../../components/findings/FindingFormSidebar'
import { ProjectFormDialog } from '../../components/projects/ProjectFormDialog'
import { StepAuditPanel } from '../../components/audit/StepAuditPanel'
import { ImportFindingsDialog } from '../../components/findings/ImportFindingsDialog'
import { useToast } from '../../components/ui/use-toast'
import { EchoButton } from '../../components/ui/echo-button'
import { KVTag } from '../../components/ui/kv-tag'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
          border: `1px solid ${active ? '#1d4ed8' : '#d0cac8'}`,
          background: active ? '#1d4ed8' : 'transparent',
          color: active ? '#fff' : '#2b2c2c',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>
          {active
            ? `${label}: ${selectedLabels.slice(0, 2).join(', ')}${selectedLabels.length > 2 ? ` +${selectedLabels.length - 2}` : ''}`
            : `${label}: Any`}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[180px] py-1"
          style={{
            background: '#fff',
            border: '1px solid #e0dbd9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            animation: 'fadeIn 0.3s ease-out'
          }}
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map((o, index) => {
            const checked = selected.includes(o.key)
            return (
              <button
                key={o.key}
                onClick={() => onToggle(o.key)}
                className="flex items-center gap-2.5 w-full px-3 py-2 font-sans text-sm text-left transition-colors hover:bg-[#f6f3f2]"
                style={{
                  color: '#2b2c2c',
                  animation: `slideUp 0.3s ease-out ${Math.min(index * 40, 200)}ms both`,
                }}
                role="option"
                aria-selected={checked}
              >
                <span
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                  style={{
                    border: `1.5px solid ${checked ? '#1d4ed8' : '#d0cac8'}`,
                    background: checked ? '#1d4ed8' : 'transparent',
                    borderRadius: '2px',
                  }}
                >
                  {checked && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                {o.label}
              </button>
            )
          })}
          {active && (
            <>
              <div style={{ height: '1px', background: '#e0dbd9', margin: '4px 0' }} />
              <button
                onClick={() => { onClear(); setOpen(false) }}
                className="flex items-center w-full px-3 py-2 font-sans text-sm text-left transition-colors hover:bg-[#f6f3f2]"
                style={{ color: '#1d4ed8' }}
              >
                Clear
              </button>
            </>
          )}
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
  const [importOpen, setImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)
  const [showFormatDialog, setShowFormatDialog] = useState(false)
  const [principleFilter, setPrincipleFilter] = useState<string[]>([])
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [pageFilter, setPageFilter] = useState<string[]>([])
  const [componentFilter, setComponentFilter] = useState<string[]>([])
  const [findingInitialData, setFindingInitialData] = useState<Partial<{title:string;description:string;wcagCriterion:string;wcagLevel:string;standards:string[];category:string;severity:string;status:string;pageUrl:string;component:string;screenshotPath:string;recommendations:string;notes:string}> | undefined>(undefined)
  const [groupByCriteria, setGroupByCriteria] = useState(false)
  const [auditVerdicts, setAuditVerdicts] = useState<Record<string, 'pass' | 'fail'>>(() => {
    try {
      const saved = localStorage.getItem(`echo-step-audit-${id}`)
      if (saved) {
        const v = JSON.parse(saved)?.criteriaVerdict
        if (v && typeof v === 'object') return v as Record<string, 'pass' | 'fail'>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [stepAuditNavCriterionId, setStepAuditNavCriterionId] = useState<string | undefined>()
  const [stepAuditOpen, setStepAuditOpen] = useState(false)
  const [stepAuditMounted, setStepAuditMounted] = useState(false)
  const [stepAuditWide, setStepAuditWide] = useState(false)
  const [findingSidebarMounted, setFindingSidebarMounted] = useState(false)
  const [findingSidebarWide, setFindingSidebarWide] = useState(false)
  const [layoutReady, setLayoutReady] = useState(false)

  // Toolkit inner panel: null = normal view, 'pages' | 'components' | 'config' = management panel
  const [toolkitPanel, setToolkitPanel] = useState<null | 'pages' | 'components' | 'config'>(null)
  const [newPageValue, setNewPageValue] = useState('')
  const [newComponentValue, setNewComponentValue] = useState('')
  const [renamingPage, setRenamingPage] = useState<string | null>(null)
  const [renamePageValue, setRenamePageValue] = useState('')
  const [renamingComponent, setRenamingComponent] = useState<string | null>(null)
  const [renameComponentValue, setRenameComponentValue] = useState('')

  const findingsScrollRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollThumb, setScrollThumb] = useState({ top: 0, height: 0 })

  const pagesBodyRef = useRef<HTMLDivElement>(null)
  const pagesScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isPagesScrolling, setIsPagesScrolling] = useState(false)
  const [pagesScrollThumb, setPagesScrollThumb] = useState({ top: 0, height: 0 })

  const componentsBodyRef = useRef<HTMLDivElement>(null)
  const componentsScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isComponentsScrolling, setIsComponentsScrolling] = useState(false)
  const [componentsScrollThumb, setComponentsScrollThumb] = useState({ top: 0, height: 0 })

  const handleFindingsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    if (max <= 0) return
    const thumbH = Math.max(20, (clientHeight / scrollHeight) * 100)
    const thumbTop = (scrollTop / max) * (100 - thumbH)
    setScrollThumb({ top: thumbTop, height: thumbH })
    setIsScrolling(true)
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 1200)
  }, [])

  function handlePagesScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    if (max <= 0) return
    const thumbH = Math.max(20, (clientHeight / scrollHeight) * 100)
    const thumbTop = (scrollTop / max) * (100 - thumbH)
    setPagesScrollThumb({ top: thumbTop, height: thumbH })
    setIsPagesScrolling(true)
    clearTimeout(pagesScrollTimerRef.current)
    pagesScrollTimerRef.current = setTimeout(() => setIsPagesScrolling(false), 1200)
  }

  function handleComponentsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    if (max <= 0) return
    const thumbH = Math.max(20, (clientHeight / scrollHeight) * 100)
    const thumbTop = (scrollTop / max) * (100 - thumbH)
    setComponentsScrollThumb({ top: thumbTop, height: thumbH })
    setIsComponentsScrolling(true)
    clearTimeout(componentsScrollTimerRef.current)
    componentsScrollTimerRef.current = setTimeout(() => setIsComponentsScrolling(false), 1200)
  }

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
    if (principleFilter.length > 0) {
      const prefix = f.wcagCriterion?.split('.')[0]
      if (!prefix || !principleFilter.includes(prefix)) return false
    }
    if (severityFilter.length > 0 && !severityFilter.includes(f.severity ?? '')) return false
    if (statusFilter.length > 0 && !statusFilter.includes(f.status ?? '')) return false
    if (pageFilter.length > 0 && !pageFilter.includes(f.pageUrl ?? '')) return false
    if (componentFilter.length > 0 && !componentFilter.includes(f.component ?? '')) return false
    return true
  })

  const activeFilterCount =
    principleFilter.length + severityFilter.length + statusFilter.length + pageFilter.length + componentFilter.length

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

  function markCriterionPassed(criterionId: string) {
    try {
      const key = `echo-step-audit-${id}`
      const saved = localStorage.getItem(key)
      const data = saved ? JSON.parse(saved) : {}
      const criteriaVerdict = { ...(data.criteriaVerdict ?? {}), [criterionId]: 'pass' as const }
      localStorage.setItem(key, JSON.stringify({ ...data, criteriaVerdict }))
      setAuditVerdicts(prev => ({ ...prev, [criterionId]: 'pass' }))
    } catch { /* ignore */ }
  }

  function openStepAuditAtCriterion(criterionId: string) {
    setStepAuditNavCriterionId(criterionId)
    setStepAuditOpen(true)
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
    setToolkitPanel(null)
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

  const passCount = Object.values(auditVerdicts).filter(v => v === 'pass').length
  const failCount = Object.values(auditVerdicts).filter(v => v === 'fail').length
  const unknownCount = WCAG_CRITERIA.length - passCount - failCount

  const anySidebarOpen = sidebarOpen || stepAuditOpen
  // margin-right is included so the gap smoothly closes when going to wide mode
  const tr = layoutReady ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
  const toolkitWidth = `calc(18rem + 100px)`

  // No CSS gap on the outer container — spacing comes from main column's marginRight only.
  // This avoids the hidden sidebars (width: 0) still contributing gap space between main and toolkit.
  const mainIsWide = (sidebarOpen && findingSidebarWide) || (stepAuditOpen && stepAuditWide)
  const mainMarginRight = mainIsWide ? '0px' : '12px'
  const mainWidth = sidebarOpen
    ? (findingSidebarWide ? '0px' : 'calc(50% - 12px)')
    : stepAuditOpen
      ? (stepAuditWide ? '0px' : 'calc(50% - 12px)')
      : `calc(100% - ${toolkitWidth} - 12px)`

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{
        background: '#d8d3d1',
        transition: tr,
        padding: '12px',
      }}
    >

      {/* ── Main column ── */}
      <div
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          width: mainWidth,
          marginRight: mainMarginRight,
          transition: tr,
          borderRadius: '10px',
          background: '#fcf9f8',
          overflow: 'hidden',
        }}
      >

        {/* Project header */}
        <div className="flex-shrink-0 px-10 pt-8 pb-0" style={{ background: '#fcf9f8' }}>
          {/* Project info */}
          <div className="mb-5">
            {/* Standards label */}
            {project.standards && (
              <p
                className="font-sans text-xs font-bold uppercase mb-3"
                style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}
              >
                {project.standards} Audit
              </p>
            )}

            {/* Project name — large serif */}
            <h1
              className="font-serif font-bold leading-none"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}
            >
              {project.name}
            </h1>

            {/* Audit stats — horizontal row below title */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <KVTag label="Findings" value={String(findings.length)} />
              <KVTag label="Unknown" value={String(unknownCount)} />
              <KVTag label="Passed" value={String(passCount)} valueVariant="pass" />
              <KVTag label="Failed" value={String(failCount)} valueVariant="fail" />
            </div>

            {/* Client + URL */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
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
          </div>

        </div>

        {/* Findings list */}
        <main id="main-findings" className="flex-1 overflow-hidden flex flex-col">

          {/* Secondary filters — pinned, does not scroll with findings */}
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap px-10 py-3" style={{ borderBottom: '1px solid #e0dbd9', background: '#fcf9f8' }}>
            {findings.length > 0 && (
              <>
                <MultiSelectFilter
                  label="Principle"
                  options={[
                    { key: '1', label: 'Perceivable' },
                    { key: '2', label: 'Operable' },
                    { key: '3', label: 'Understandable' },
                    { key: '4', label: 'Robust' },
                  ]}
                  selected={principleFilter}
                  onToggle={v => toggleFilter(v, principleFilter, setPrincipleFilter)}
                  onClear={() => setPrincipleFilter([])}
                />
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
                      setPrincipleFilter([])
                      setSeverityFilter([])
                      setStatusFilter([])
                      setPageFilter([])
                      setComponentFilter([])
                    }}
                    className="font-sans text-xs underline underline-offset-2"
                    style={{ color: '#1d4ed8' }}
                  >
                    Clear all
                  </button>
                )}
              </>
            )}
            {/* Group by criteria toggle — always visible */}
            <label
              className="flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 cursor-pointer select-none ml-auto"
              style={{ background: groupByCriteria ? '#1d4ed8' : 'transparent', color: groupByCriteria ? '#fff' : '#2b2c2c' }}
            >
              <input
                type="checkbox"
                checked={groupByCriteria}
                onChange={e => setGroupByCriteria(e.target.checked)}
                className="sr-only"
              />
              <span
                className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center"
                style={{ border: `1.5px solid ${groupByCriteria ? '#fff' : '#d0cac8'}`, background: groupByCriteria ? '#fff' : 'transparent', borderRadius: '2px' }}
              >
                {groupByCriteria && <Check className="h-2 w-2" style={{ color: '#1d4ed8' }} />}
              </span>
              Group by criteria
            </label>
          </div>

          {/* Scrollable findings area */}
          <div className="flex-1 overflow-hidden relative">
          {/* Bottom fade — always shown to hint scrollability */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: '64px', background: 'linear-gradient(to bottom, transparent, #fcf9f8)' }}
          />
          {/* Custom scroll indicator — visible only while scrolling */}
          <div
            className="absolute right-1 z-20 pointer-events-none transition-opacity duration-500"
            style={{ top: '8px', bottom: '8px', width: '3px', opacity: isScrolling ? 1 : 0 }}
          >
            <div
              style={{
                position: 'absolute',
                right: 0,
                width: '3px',
                borderRadius: '2px',
                background: '#c8c3c0',
                height: `${scrollThumb.height}%`,
                top: `${scrollThumb.top}%`,
                transition: 'top 0.1s linear',
              }}
            />
          </div>
          <div
            ref={findingsScrollRef}
            className="no-scrollbar h-full overflow-y-auto py-6"
            style={{ paddingLeft: '40px', paddingRight: '44px' }}
            onScroll={handleFindingsScroll}
          >

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


          {!isLoading && findings.length === 0 && !error && (
            <div className="py-24 text-center">
              <h2 className="font-serif font-bold text-2xl mb-2">No findings yet</h2>
              <p className="font-sans text-sm mb-8 max-w-xs mx-auto" style={{ color: '#5f5e5e' }}>
                Click &ldquo;Add finding&rdquo; in the Audit Toolkit to log your first accessibility issue.
              </p>
            </div>
          )}

          {!groupByCriteria ? (
            <FindingTable
              findings={filtered}
              isLoading={isLoading}
              onEdit={(f) => setEditFinding(f as Finding)}
              onUpdate={updateFinding}
              onDelete={deleteFinding}
            />
          ) : (
            (() => {
              // Use all findings (not filtered) so empty = truly no findings for that criterion
              const findingsByCriterion: Record<string, Finding[]> = {}
              const unassigned: Finding[] = []
              for (const f of findings) {
                if (!f.wcagCriterion) { unassigned.push(f); continue }
                if (!findingsByCriterion[f.wcagCriterion]) findingsByCriterion[f.wcagCriterion] = []
                findingsByCriterion[f.wcagCriterion].push(f)
              }
              // Respect the principle tab filter in grouped mode
              const criteriaToShow = principleFilter.length === 0
                ? WCAG_CRITERIA
                : WCAG_CRITERIA.filter(c => principleFilter.some(p => c.id.startsWith(p + '.')))
              return (
                <div className="space-y-6" style={{ paddingBottom: '2rem' }}>
                  {criteriaToShow.map(criterion => {
                    const groupFindings = findingsByCriterion[criterion.id] ?? []
                    const isEmpty = groupFindings.length === 0
                    const criterionVerdict = auditVerdicts[criterion.id]
                    return (
                      <div key={criterion.id}>
                        {/* Criterion heading row */}
                        <div className="flex items-center gap-2 mb-2 pb-2.5" style={{ borderBottom: '1px solid #e0dbd9' }}>
                          <span className="font-sans text-sm font-bold uppercase tracking-widest flex-shrink-0" style={{ color: '#1d4ed8', letterSpacing: '0.1em' }}>
                            {criterion.id}
                          </span>
                          <span className="font-serif font-bold text-base truncate" style={{ color: '#1a1a1a' }}>
                            {criterion.name}
                          </span>
                          {criterionVerdict === 'pass' && (
                            <span className="flex items-center gap-1 font-sans text-xs font-bold px-2 py-0.5 uppercase flex-shrink-0" style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.06em', borderRadius: '3px' }}>
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Pass
                            </span>
                          )}
                          {criterionVerdict === 'fail' && (
                            <span className="font-sans text-xs font-bold px-2 py-0.5 uppercase flex-shrink-0" style={{ background: '#dc2626', color: '#fff', letterSpacing: '0.06em', borderRadius: '3px' }}>
                              Fail
                            </span>
                          )}
                          {!criterionVerdict && (
                            <span className="font-sans text-xs font-bold px-2 py-0.5 uppercase flex-shrink-0" style={{ background: '#e5e2e1', color: '#5f5e5e', letterSpacing: '0.06em', borderRadius: '3px' }}>
                              Unknown
                            </span>
                          )}
                          <span className="font-sans text-xs flex-shrink-0" style={{ color: '#b0aaa8', marginLeft: 'auto' }}>
                            Level {criterion.level}
                          </span>
                          {!isEmpty && (
                            <span className="font-sans text-xs flex-shrink-0" style={{ color: '#5f5e5e' }}>
                              {groupFindings.length} finding{groupFindings.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Findings list */}
                        {!isEmpty && (
                          <ul className="space-y-0" role="list">
                            {groupFindings.map((finding, idx) => (
                              <li key={finding.id} style={{ animation: `fadeIn 0.3s ease-out ${idx * 40}ms both` }}>
                                <FindingRow
                                  finding={finding}
                                  onEdit={() => setEditFinding(finding)}
                                  onUpdate={updateFinding}
                                  onDelete={deleteFinding}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Empty state: passed */}
                        {isEmpty && criterionVerdict === 'pass' && (
                          <div className="flex items-center gap-3 px-4 py-3 mt-2" style={{ background: '#f0faf4', border: '1px solid #c3e6d0', borderRadius: '6px' }}>
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" style={{ color: '#2d7a4f' }} />
                            <span className="font-sans text-sm font-semibold" style={{ color: '#2d7a4f' }}>Passed — no findings</span>
                            <EchoButton
                              onClick={() => openStepAuditAtCriterion(criterion.id)}
                              style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '12px' }}
                            >
                              Log Finding
                            </EchoButton>
                          </div>
                        )}
                        {/* Empty state: not yet assessed */}
                        {isEmpty && criterionVerdict !== 'pass' && (
                          <div className="flex items-center gap-3 px-4 py-3.5 mt-2" style={{ background: '#ffffff', border: '1px solid #e0dbd9', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <span className="font-sans text-sm font-medium" style={{ color: '#9a9590' }}>No logged findings</span>
                            <div className="ml-auto flex items-center gap-2">
                              <EchoButton
                                onClick={() => openStepAuditAtCriterion(criterion.id)}
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                              >
                                Log Finding
                              </EchoButton>
                              <EchoButton
                                icon={<Check className="h-3 w-3" />}
                                iconPosition="left"
                                onClick={() => markCriterionPassed(criterion.id)}
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                              >
                                Mark as Passed
                              </EchoButton>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {/* Findings with no criterion assigned — only in All view */}
                  {principleFilter.length === 0 && unassigned.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: '1px solid #e0dbd9' }}>
                        <span className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#1d4ed8', letterSpacing: '0.1em' }}>
                          Unassigned
                        </span>
                        <span className="font-sans text-xs ml-auto" style={{ color: '#5f5e5e' }}>
                          {unassigned.length} finding{unassigned.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ul className="space-y-0" role="list">
                        {unassigned.map((finding, idx) => (
                          <li key={finding.id} style={{ animation: `fadeIn 0.3s ease-out ${idx * 40}ms both` }}>
                            <FindingRow
                              finding={finding}
                              onEdit={() => setEditFinding(finding)}
                              onUpdate={updateFinding}
                              onDelete={deleteFinding}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()
          )}
          </div>{/* end scrollable inner */}
          </div>{/* end scroll wrapper */}
        </main>
      </div>

      {/* ── Finding Form Sidebar — in-layout, same pattern as StepAuditPanel ── */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{
          width: sidebarOpen ? (findingSidebarWide ? '100%' : '50%') : '0',
          transition: tr,
          opacity: sidebarOpen ? 1 : 0,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(20px)',
          transitionProperty: 'width, opacity, transform, border-radius',
          transitionDuration: layoutReady ? '0.3s' : '0s',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '10px',
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
          opacity: stepAuditOpen ? 1 : 0,
          transform: stepAuditOpen ? 'translateX(0)' : 'translateX(20px)',
          transitionProperty: 'width, opacity, transform, border-radius',
          transitionDuration: layoutReady ? '0.3s' : '0s',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
        aria-hidden={!stepAuditOpen}
      >
        {stepAuditMounted && (
          <StepAuditPanel
            onClose={() => {
              setStepAuditOpen(false)
              setStepAuditWide(false)
              // Re-read verdicts so grouped view reflects any pass/fail changes made in audit
              try {
                const saved = localStorage.getItem(`echo-step-audit-${id}`)
                if (saved) {
                  const v = JSON.parse(saved)?.criteriaVerdict
                  if (v && typeof v === 'object') setAuditVerdicts(v as Record<string, 'pass' | 'fail'>)
                }
              } catch { /* ignore */ }
            }}
            isWide={stepAuditWide}
            onToggleWide={() => setStepAuditWide(w => !w)}
            projectId={id!}
            auditPages={project.auditUrls}
            auditComponents={project.components}
            findings={findings}
            templates={templates}
            navigateToCriterionId={stepAuditNavCriterionId}
            onVerdictChange={(verdicts) => setAuditVerdicts(verdicts)}
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
          background: toolkitPanel ? '#ffffff' : '#f6f3f2',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
        aria-label="Audit toolkit"
        aria-hidden={anySidebarOpen}
      >
        {/* Fixed-width inner — prevents content reflow during width transition */}
        <div className="flex flex-col h-full" style={{ width: toolkitWidth }}>

          {/* ── Normal toolkit view ── */}
          {toolkitPanel === null && (
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pt-8 pb-8 flex flex-col gap-6">

              {/* Section: Audit Toolkit */}
              <div>
                <h2 className="font-serif font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                  Audit Toolkit
                </h2>
                <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                  Log and review accessibility findings.
                </p>
                <div className="space-y-2">
                  <EchoButton variant="primary" icon={<Plus className="h-4 w-4" />} iconPosition="right" fullWidth onClick={openBlankFinding}>
                    Add Finding
                  </EchoButton>
                  <EchoButton icon={<ListChecks className="h-4 w-4" />} iconPosition="right" fullWidth onClick={() => setStepAuditOpen(true)}>
                    Step-by-step Audit
                  </EchoButton>
                  <EchoButton icon={<Upload className="h-4 w-4" />} iconPosition="right" fullWidth onClick={() => setImportOpen(true)}>
                    Import Findings
                  </EchoButton>
                </div>
              </div>

              {/* Section: Reports */}
              <div>
                <h2 className="font-serif font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                  Reports
                </h2>
                <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                  Export your audit results.
                </p>
                <div className="space-y-2">
                  <EchoButton variant="primary" icon={<Download className="h-4 w-4" />} iconPosition="right" fullWidth onClick={handleClickExportPDF} disabled={!!isExporting} aria-busy={isExporting === 'pdf'}>
                    {isExporting === 'pdf' ? 'Generating…' : 'Export Report (PDF)'}
                  </EchoButton>
                  <EchoButton icon={<Download className="h-4 w-4" />} iconPosition="right" fullWidth onClick={handleExportCSV} disabled={!!isExporting || findings.length === 0} aria-busy={isExporting === 'csv'}>
                    {isExporting === 'csv' ? 'Exporting…' : 'Export Report (CSV)'}
                  </EchoButton>
                </div>
              </div>

              {/* Section: Settings */}
              <div>
                <h2 className="font-serif font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                  Settings
                </h2>
                <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                  Configure your project scope.
                </p>
                <div className="space-y-2">
                  <EchoButton icon={<Settings2 className="h-4 w-4" />} iconPosition="right" fullWidth onClick={() => setToolkitPanel('config')}>
                    Configure Project
                  </EchoButton>
                  <EchoButton icon={<Plus className="h-4 w-4" />} iconPosition="right" fullWidth onClick={() => setToolkitPanel('pages')}>
                    Pages
                  </EchoButton>
                  <EchoButton icon={<Plus className="h-4 w-4" />} iconPosition="right" fullWidth onClick={() => setToolkitPanel('components')}>
                    Components
                  </EchoButton>
                </div>
              </div>

            </div>
          )}

          {/* ── Configure Project panel ── */}
          {toolkitPanel === 'config' && (
            <ProjectFormDialog
              open={true}
              onOpenChange={(o) => { if (!o) setToolkitPanel(null) }}
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
          )}

          {/* ── Manage Pages panel ── */}
          {toolkitPanel === 'pages' && (
            <div className="flex flex-col h-full overflow-hidden" style={{ borderLeft: '1px solid #e0dbd9' }}>
              <div className="flex-shrink-0 flex items-center justify-between px-6" style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}>
                <span className="font-sans text-sm font-bold uppercase tracking-widest" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>Pages</span>
                <button
                  onClick={() => { setToolkitPanel(null); setNewPageValue(''); setRenamingPage(null); setRenamePageValue('') }}
                  className="flex items-center justify-center hover:text-foreground transition-colors"
                  style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                  style={{ height: '48px', background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
                <div className="absolute right-1 z-20 pointer-events-none transition-opacity duration-500"
                  style={{ top: '8px', bottom: '8px', width: '3px', opacity: isPagesScrolling ? 1 : 0 }}>
                  <div style={{ position: 'absolute', right: 0, width: '3px', borderRadius: '2px', background: '#c8c3c0', height: `${pagesScrollThumb.height}%`, top: `${pagesScrollThumb.top}%`, transition: 'top 0.1s linear' }} />
                </div>
                <div ref={pagesBodyRef} className="no-scrollbar h-full overflow-y-auto px-6 py-5 space-y-4" onScroll={handlePagesScroll}>
                  <p className="font-sans text-sm" style={{ color: '#5f5e5e' }}>Add, rename, or remove pages tracked in this audit.</p>
                  {project.auditUrls.length > 0 && (
                    <div className="space-y-1">
                      {project.auditUrls.map((page) => (
                        <div key={page} className="flex items-center gap-2 px-3 py-2" style={{ background: '#f6f3f2' }}>
                          {renamingPage === page ? (
                            <>
                              <input autoFocus value={renamePageValue} onChange={(e) => setRenamePageValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePage(page, renamePageValue); if (e.key === 'Escape') { setRenamingPage(null); setRenamePageValue('') } }}
                                className="flex-1 h-8 px-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                style={{ borderColor: '#d0cac8' }}
                              />
                              <button onClick={() => handleRenamePage(page, renamePageValue)} disabled={!renamePageValue.trim()} className="px-2.5 py-1 font-sans text-xs font-bold text-white disabled:opacity-40" style={{ background: '#1d4ed8' }}>Save</button>
                              <button onClick={() => { setRenamingPage(null); setRenamePageValue('') }} className="px-2.5 py-1 font-sans text-xs font-medium" style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 font-sans text-sm truncate" style={{ color: '#2b2c2c' }}>{page}</span>
                              <button onClick={() => { setRenamingPage(page); setRenamePageValue(page) }} className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-[#ede9e7] transition-colors" style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}>Rename</button>
                              <button onClick={() => handleDeletePage(page)} className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-red-50 transition-colors" style={{ border: '1px solid #d0cac8', color: '#c0392b' }}>Delete</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newPageValue} onChange={(e) => setNewPageValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmAddPage() }}
                      placeholder="/about or Home"
                      className="flex-1 h-9 px-3 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ borderColor: '#d0cac8' }}
                    />
                    <EchoButton variant="primary" onClick={confirmAddPage} disabled={!newPageValue.trim()} style={{ padding: '0 16px' }}>
                      Add
                    </EchoButton>
                  </div>
                  <div style={{ height: '32px' }} />
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}>
                <EchoButton onClick={() => { setToolkitPanel(null); setNewPageValue(''); setRenamingPage(null); setRenamePageValue('') }}>
                  Cancel
                </EchoButton>
                <EchoButton variant="primary" onClick={() => { setToolkitPanel(null); setNewPageValue(''); setRenamingPage(null); setRenamePageValue('') }}>
                  Done
                </EchoButton>
              </div>
            </div>
          )}

          {/* ── Manage Components panel ── */}
          {toolkitPanel === 'components' && (
            <div className="flex flex-col h-full overflow-hidden" style={{ borderLeft: '1px solid #e0dbd9' }}>
              <div className="flex-shrink-0 flex items-center justify-between px-6" style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}>
                <span className="font-sans text-sm font-bold uppercase tracking-widest" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>Components</span>
                <button
                  onClick={() => { setToolkitPanel(null); setNewComponentValue(''); setRenamingComponent(null); setRenameComponentValue('') }}
                  className="flex items-center justify-center hover:text-foreground transition-colors"
                  style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                  style={{ height: '48px', background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
                <div className="absolute right-1 z-20 pointer-events-none transition-opacity duration-500"
                  style={{ top: '8px', bottom: '8px', width: '3px', opacity: isComponentsScrolling ? 1 : 0 }}>
                  <div style={{ position: 'absolute', right: 0, width: '3px', borderRadius: '2px', background: '#c8c3c0', height: `${componentsScrollThumb.height}%`, top: `${componentsScrollThumb.top}%`, transition: 'top 0.1s linear' }} />
                </div>
                <div ref={componentsBodyRef} className="no-scrollbar h-full overflow-y-auto px-6 py-5 space-y-4" onScroll={handleComponentsScroll}>
                  <p className="font-sans text-sm" style={{ color: '#5f5e5e' }}>Add, rename, or remove components tracked in this audit.</p>
                  {project.components.length > 0 && (
                    <div className="space-y-1">
                      {project.components.map((comp) => (
                        <div key={comp} className="flex items-center gap-2 px-3 py-2" style={{ background: '#f6f3f2' }}>
                          {renamingComponent === comp ? (
                            <>
                              <input autoFocus value={renameComponentValue} onChange={(e) => setRenameComponentValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameComponent(comp, renameComponentValue); if (e.key === 'Escape') { setRenamingComponent(null); setRenameComponentValue('') } }}
                                className="flex-1 h-8 px-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                style={{ borderColor: '#d0cac8' }}
                              />
                              <button onClick={() => handleRenameComponent(comp, renameComponentValue)} disabled={!renameComponentValue.trim()} className="px-2.5 py-1 font-sans text-xs font-bold text-white disabled:opacity-40" style={{ background: '#1d4ed8' }}>Save</button>
                              <button onClick={() => { setRenamingComponent(null); setRenameComponentValue('') }} className="px-2.5 py-1 font-sans text-xs font-medium" style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 font-sans text-sm truncate" style={{ color: '#2b2c2c' }}>{comp}</span>
                              <button onClick={() => { setRenamingComponent(comp); setRenameComponentValue(comp) }} className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-[#ede9e7] transition-colors" style={{ border: '1px solid #d0cac8', color: '#2b2c2c' }}>Rename</button>
                              <button onClick={() => handleDeleteComponent(comp)} className="px-2.5 py-1 font-sans text-xs font-medium hover:bg-red-50 transition-colors" style={{ border: '1px solid #d0cac8', color: '#c0392b' }}>Delete</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newComponentValue} onChange={(e) => setNewComponentValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirmAddComponent() }}
                      placeholder="Navigation, Hero, Footer…"
                      className="flex-1 h-9 px-3 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ borderColor: '#d0cac8' }}
                    />
                    <EchoButton variant="primary" onClick={confirmAddComponent} disabled={!newComponentValue.trim()} style={{ padding: '0 16px' }}>
                      Add
                    </EchoButton>
                  </div>
                  <div style={{ height: '32px' }} />
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}>
                <EchoButton onClick={() => { setToolkitPanel(null); setNewComponentValue(''); setRenamingComponent(null); setRenameComponentValue('') }}>
                  Cancel
                </EchoButton>
                <EchoButton variant="primary" onClick={() => { setToolkitPanel(null); setNewComponentValue(''); setRenamingComponent(null); setRenameComponentValue('') }}>
                  Done
                </EchoButton>
              </div>
            </div>
          )}

        </div>{/* end fixed-width inner */}
      </aside>

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
                  <span className="font-semibold" style={{ color: '#1d4ed8' }}>Summary Report</span>
                  <span className="text-xs text-gray-600 mt-1">Executive overview with findings grouped by severity</span>
                </button>
                <button
                  onClick={() => handleExportPDF('vpat')}
                  disabled={!!isExporting}
                  className="w-full flex flex-col items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                  style={{ borderColor: '#e0dbd9' }}
                >
                  <span className="font-semibold" style={{ color: '#1d4ed8' }}>VPAT Report</span>
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

