import { useState, useEffect, useRef } from 'react'
import { X, Image, Plus, Check, Maximize2, Minimize2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Badge } from '../ui/badge'
import { WCAG_CRITERIA, SEVERITY_OPTIONS, CATEGORY_OPTIONS, STANDARDS_OPTIONS } from '../../lib/utils'

interface FindingFormData {
  projectId: string
  title: string
  description?: string
  wcagCriterion?: string
  wcagLevel?: string
  standards?: string[]
  category?: string
  severity?: string
  status?: string
  pageUrl?: string
  component?: string
  screenshotPath?: string
  recommendations?: string
  notes?: string
}

interface FindingTemplate {
  id: string
  title: string
  description: string | null
  wcagCriterion: string | null
  wcagLevel: string | null
  standards: string[]
  category: string | null
  severity: string | null
  recommendations: string | null
  notes: string | null
}

interface FindingFormSidebarProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FindingFormData) => Promise<void>
  mode: 'create' | 'edit'
  projectId: string
  auditPages?: string[]
  auditComponents?: string[]
  onAddPage?: (page: string) => Promise<void>
  onAddComponent?: (component: string) => Promise<void>
  templates?: FindingTemplate[]
  initialData?: Partial<FindingFormData>
  isWide?: boolean
  onToggleWide?: () => void
}

export function FindingFormSidebar({
  open,
  onClose,
  onSubmit,
  mode,
  projectId,
  auditPages = [],
  auditComponents = [],
  onAddPage,
  onAddComponent,
  templates = [],
  initialData,
  isWide = false,
  onToggleWide,
}: FindingFormSidebarProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [wcagCriterion, setWcagCriterion] = useState(initialData?.wcagCriterion || '')
  const [wcagLevel, setWcagLevel] = useState(initialData?.wcagLevel || '')
  const [standards, setStandards] = useState<string[]>(initialData?.standards || [])
  const [category, setCategory] = useState(initialData?.category || '')
  const [severity, setSeverity] = useState(initialData?.severity || 'moderate')
  const [status, setStatus] = useState(initialData?.status || 'open')
  const [pageUrl, setPageUrl] = useState(initialData?.pageUrl || '')
  const [component, setComponent] = useState(initialData?.component || '')
  const [screenshotPath, setScreenshotPath] = useState(initialData?.screenshotPath || '')
  const [recommendations, setRecommendations] = useState(initialData?.recommendations || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [criterionSearch, setCriterionSearch] = useState('')

  // Inline add page/component state
  const [addingPage, setAddingPage] = useState(false)
  const [newPageValue, setNewPageValue] = useState('')
  const [addingComponent, setAddingComponent] = useState(false)
  const [newComponentValue, setNewComponentValue] = useState('')
  const [localPages, setLocalPages] = useState<string[]>(auditPages)
  const [localComponents, setLocalComponents] = useState<string[]>(auditComponents)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)
  const newPageRef = useRef<HTMLInputElement>(null)
  const newComponentRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalPages(auditPages)
  }, [auditPages])

  useEffect(() => {
    setLocalComponents(auditComponents)
  }, [auditComponents])

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '')
      setDescription(initialData?.description || '')
      setWcagCriterion(initialData?.wcagCriterion || '')
      setWcagLevel(initialData?.wcagLevel || '')
      setStandards(initialData?.standards || [])
      setCategory(initialData?.category || '')
      setSeverity(initialData?.severity || 'moderate')
      setStatus(initialData?.status || 'open')
      setPageUrl(initialData?.pageUrl || '')
      setComponent(initialData?.component || '')
      setScreenshotPath(initialData?.screenshotPath || '')
      setRecommendations(initialData?.recommendations || '')
      setNotes(initialData?.notes || '')
      setError(null)
      setCriterionSearch('')
      setAddingPage(false)
      setNewPageValue('')
      setAddingComponent(false)
      setNewComponentValue('')
      setSelectedTemplateId('')
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (addingPage) setTimeout(() => newPageRef.current?.focus(), 50)
  }, [addingPage])

  useEffect(() => {
    if (addingComponent) setTimeout(() => newComponentRef.current?.focus(), 50)
  }, [addingComponent])

  function handleCriterionSelect(criterion: typeof WCAG_CRITERIA[number]) {
    setWcagCriterion(criterion.id)
    setWcagLevel(criterion.level)
    setCategory(criterion.category)
    setCriterionSearch('')
    const matchingWcag = STANDARDS_OPTIONS
      .filter((s) => s.value.startsWith('WCAG') && s.value.endsWith(` ${criterion.level}`))
      .map((s) => s.value)
    setStandards((prev) => {
      const nonWcag = prev.filter((s) => !s.startsWith('WCAG'))
      return [...nonWcag, ...matchingWcag]
    })
  }

  function applyTemplateById(templateId: string) {
    setSelectedTemplateId(templateId)
    const t = templates.find((tmpl) => tmpl.id === templateId)
    if (!t) return
    setTitle(t.title)
    setDescription(t.description ?? '')
    setWcagCriterion(t.wcagCriterion ?? '')
    setWcagLevel(t.wcagLevel ?? '')
    setStandards(t.standards ?? [])
    setCategory(t.category ?? '')
    setSeverity(t.severity ?? 'moderate')
    setRecommendations(t.recommendations ?? '')
    setNotes(t.notes ?? '')
    setCriterionSearch('')
  }

  function toggleStandard(std: string) {
    setStandards((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std]
    )
  }

  async function chooseScreenshot() {
    const path = await window.api.export.chooseScreenshot()
    if (path) setScreenshotPath(path)
  }

  async function confirmAddPage() {
    const trimmed = newPageValue.trim()
    if (!trimmed) return
    if (!localPages.includes(trimmed)) {
      const updated = [...localPages, trimmed]
      setLocalPages(updated)
      if (onAddPage) await onAddPage(trimmed)
    }
    setPageUrl(trimmed)
    setAddingPage(false)
    setNewPageValue('')
  }

  async function confirmAddComponent() {
    const trimmed = newComponentValue.trim()
    if (!trimmed) return
    if (!localComponents.includes(trimmed)) {
      const updated = [...localComponents, trimmed]
      setLocalComponents(updated)
      if (onAddComponent) await onAddComponent(trimmed)
    }
    setComponent(trimmed)
    setAddingComponent(false)
    setNewComponentValue('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await onSubmit({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        wcagCriterion: wcagCriterion || undefined,
        wcagLevel: wcagLevel || undefined,
        standards: standards.length > 0 ? standards : undefined,
        category: category || undefined,
        severity,
        status,
        pageUrl: pageUrl || undefined,
        component: component.trim() || undefined,
        screenshotPath: screenshotPath || undefined,
        recommendations: recommendations.trim() || undefined,
        notes: notes.trim() || undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCriteria = criterionSearch.trim()
    ? WCAG_CRITERIA.filter(
        (c) =>
          c.id.includes(criterionSearch) ||
          c.name.toLowerCase().includes(criterionSearch.toLowerCase())
      ).slice(0, 8)
    : []

  const heading = mode === 'create' ? 'Add Finding' : 'Edit Finding'

  // Shared button style (consistent 32px height)
  const btnBase: React.CSSProperties = {
    border: '1px solid #d0cac8',
    borderRadius: '4px',
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    fontSize: '13px',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap' as const,
    background: 'transparent',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#ffffff', borderLeft: '1px solid #e0dbd9' }}
    >
      {/* ── Header — matches StepAuditPanel style ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6"
        style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}
      >
        <span
          className="font-sans text-sm font-bold uppercase tracking-widest"
          style={{ color: '#610000', letterSpacing: '0.12em' }}
        >
          {heading}
        </span>
        <div className="flex items-center gap-1">
          {onToggleWide && (
            <button
              type="button"
              onClick={onToggleWide}
              className="flex items-center justify-center transition-colors hover:text-foreground"
              style={{ color: '#5f5e5e', width: '40px', height: '40px', borderRadius: '4px' }}
              aria-label={isWide ? 'Exit wide mode' : 'Enter wide mode'}
            >
              {isWide ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:text-foreground"
            style={{ color: '#5f5e5e', width: '40px', height: '40px', borderRadius: '4px' }}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Form body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <form onSubmit={handleSubmit} id="finding-sidebar-form" noValidate aria-label={heading}>
          {error && (
            <div
              role="alert"
              className="mb-4 px-3 py-2 font-sans text-sm"
              style={{ background: '#fef2f2', color: '#c0392b', border: '1px solid #fecaca', borderRadius: '4px' }}
            >
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Load from template */}
            {mode === 'create' && templates.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="sf-template" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Load from template
                </Label>
                <Select value={selectedTemplateId} onValueChange={applyTemplateById}>
                  <SelectTrigger id="sf-template">
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-title" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Title <span aria-hidden="true" style={{ color: '#610000' }}>*</span>
              </Label>
              <Input
                id="sf-title"
                ref={titleRef}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Images missing alternative text"
                disabled={isLoading}
              />
            </div>

            {/* Severity + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sf-severity" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Severity
                </Label>
                <Select value={severity} onValueChange={setSeverity} disabled={isLoading}>
                  <SelectTrigger id="sf-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sf-status" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                  <SelectTrigger id="sf-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Page */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-page" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Page
              </Label>
              {localPages.length > 0 ? (
                <Select value={pageUrl} onValueChange={setPageUrl} disabled={isLoading}>
                  <SelectTrigger id="sf-page">
                    <SelectValue placeholder="Select page…" />
                  </SelectTrigger>
                  <SelectContent>
                    {localPages.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="sf-page"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="/home"
                  disabled={isLoading}
                />
              )}
              {addingPage ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    ref={newPageRef}
                    value={newPageValue}
                    onChange={(e) => setNewPageValue(e.target.value)}
                    placeholder="/about"
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); confirmAddPage() }
                      if (e.key === 'Escape') { setAddingPage(false); setNewPageValue('') }
                    }}
                  />
                  <button type="button" onClick={confirmAddPage} className="flex-shrink-0 text-primary hover:opacity-80" aria-label="Confirm add page">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => { setAddingPage(false); setNewPageValue('') }} className="flex-shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingPage(true)}
                  disabled={isLoading}
                  className="flex items-center gap-1 font-sans text-xs text-primary hover:underline underline-offset-4 mt-1"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Add new page
                </button>
              )}
            </div>

            {/* Component */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-component" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Component
              </Label>
              {localComponents.length > 0 ? (
                <Select value={component} onValueChange={setComponent} disabled={isLoading}>
                  <SelectTrigger id="sf-component">
                    <SelectValue placeholder="Select component…" />
                  </SelectTrigger>
                  <SelectContent>
                    {localComponents.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="sf-component"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  placeholder="Navigation"
                  disabled={isLoading}
                />
              )}
              {addingComponent ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    ref={newComponentRef}
                    value={newComponentValue}
                    onChange={(e) => setNewComponentValue(e.target.value)}
                    placeholder="Login form"
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); confirmAddComponent() }
                      if (e.key === 'Escape') { setAddingComponent(false); setNewComponentValue('') }
                    }}
                  />
                  <button type="button" onClick={confirmAddComponent} className="flex-shrink-0 text-primary hover:opacity-80" aria-label="Confirm add component">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => { setAddingComponent(false); setNewComponentValue('') }} className="flex-shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingComponent(true)}
                  disabled={isLoading}
                  className="flex items-center gap-1 font-sans text-xs text-primary hover:underline underline-offset-4 mt-1"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Add new component
                </button>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-category" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Category
              </Label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger id="sf-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* WCAG criterion */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-wcag" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                WCAG Criterion
              </Label>
              <div className="relative">
                <Input
                  id="sf-wcag"
                  value={wcagCriterion
                    ? `${wcagCriterion} — ${WCAG_CRITERIA.find(c => c.id === wcagCriterion)?.name || ''}`
                    : criterionSearch}
                  onChange={(e) => {
                    setWcagCriterion('')
                    setCriterionSearch(e.target.value)
                  }}
                  placeholder="Search by number or name (e.g. 1.1.1)"
                  disabled={isLoading}
                  aria-autocomplete="list"
                  aria-controls="sf-criterion-list"
                />
                {wcagCriterion && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => { setWcagCriterion(''); setWcagLevel('') }}
                    aria-label="Clear WCAG criterion"
                  >
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                )}
              </div>
              {filteredCriteria.length > 0 && (
                <ul
                  id="sf-criterion-list"
                  className="border divide-y shadow-md max-h-48 overflow-y-auto"
                  style={{ background: '#fcf9f8', borderColor: '#ebe7e7' }}
                  role="listbox"
                  aria-label="WCAG criteria suggestions"
                >
                  {filteredCriteria.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#ebe7e7] flex items-center justify-between"
                        onClick={() => handleCriterionSelect(c)}
                        role="option"
                        aria-selected={wcagCriterion === c.id}
                      >
                        <span>
                          <span className="font-mono text-xs text-muted-foreground mr-2">{c.id}</span>
                          {c.name}
                        </span>
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                          {c.level}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Standards */}
            <div className="space-y-1.5">
              <Label className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Standards
              </Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select applicable standards">
                {STANDARDS_OPTIONS.map((std) => (
                  <button
                    key={std.value}
                    type="button"
                    onClick={() => toggleStandard(std.value)}
                    aria-pressed={standards.includes(std.value)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                      standards.includes(std.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground border-[#ebe7e7] hover:bg-[#ebe7e7] hover:text-foreground'
                    }`}
                  >
                    {std.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-description" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Issue description
              </Label>
              <Textarea
                id="sf-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the accessibility issue…"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-recommendations" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Recommendation
              </Label>
              <Textarea
                id="sf-recommendations"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="How to fix this issue…"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Screenshot */}
            <div className="space-y-1.5">
              <Label className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Screenshot
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={chooseScreenshot}
                  disabled={isLoading}
                  style={{ ...btnBase, color: '#2b2c2c' }}
                >
                  <Image style={{ width: '14px', height: '14px' }} aria-hidden="true" />
                  {screenshotPath ? 'Change' : 'Add Screenshot'}
                </button>
                {screenshotPath && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-sans text-xs text-muted-foreground truncate">
                      {screenshotPath.split('/').pop() || screenshotPath.split('\\').pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setScreenshotPath('')}
                      aria-label="Remove screenshot"
                      className="flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="sf-notes" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Notes
              </Label>
              <Textarea
                id="sf-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, references, links…"
                rows={2}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
      </div>

      {/* ── Footer: Cancel + Save ── */}
      <div
        className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          style={{ ...btnBase, color: '#2b2c2c' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="finding-sidebar-form"
          disabled={isLoading || !title.trim()}
          style={{
            ...btnBase,
            background: '#610000',
            color: '#fff',
            border: '1px solid #610000',
            opacity: (isLoading || !title.trim()) ? 0.4 : 1,
          }}
        >
          {isLoading
            ? mode === 'create' ? 'Adding…' : 'Saving…'
            : mode === 'create' ? 'Add Finding' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
