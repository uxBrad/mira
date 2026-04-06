import { useState, useEffect, useRef } from 'react'
import { X, Image } from 'lucide-react'
import { Button } from '../ui/button'
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

interface FindingFormSidebarProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FindingFormData) => Promise<void>
  mode: 'create' | 'edit'
  projectId: string
  auditPages?: string[]
  initialData?: Partial<FindingFormData>
}

export function FindingFormSidebar({
  open,
  onClose,
  onSubmit,
  mode,
  projectId,
  auditPages = [],
  initialData
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
  const titleRef = useRef<HTMLInputElement>(null)

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

  function handleCriterionSelect(criterion: typeof WCAG_CRITERIA[number]) {
    setWcagCriterion(criterion.id)
    setWcagLevel(criterion.level)
    setCategory(criterion.category)
    setCriterionSearch('')
    // Auto-select WCAG standards matching the criterion's level
    const matchingWcag = STANDARDS_OPTIONS
      .filter((s) => s.value.startsWith('WCAG') && s.value.endsWith(` ${criterion.level}`))
      .map((s) => s.value)
    setStandards((prev) => {
      const nonWcag = prev.filter((s) => !s.startsWith('WCAG'))
      return [...nonWcag, ...matchingWcag]
    })
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

  const heading = mode === 'create' ? 'Add finding' : 'Edit finding'

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="fixed top-0 right-0 z-50 h-full w-[420px] flex flex-col overflow-hidden transition-transform duration-200"
        style={{
          background: '#fcf9f8',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid #ebe7e7'
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #ebe7e7' }}
        >
          <h2 className="font-semibold text-base tracking-tight">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={handleSubmit} id="finding-sidebar-form" noValidate aria-label={heading}>
            {error && (
              <div
                role="alert"
                className="mb-4 px-3 py-2 font-data text-sm text-primary"
                style={{ background: '#ebe7e7' }}
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="sf-title" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Title <span aria-hidden="true" className="text-primary">*</span>
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
                  <Label htmlFor="sf-severity" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                  <Label htmlFor="sf-status" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                    <SelectTrigger id="sf-status">
                      <SelectValue />
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

              {/* Page + Component */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sf-page" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Page
                  </Label>
                  {auditPages.length > 0 ? (
                    <Select value={pageUrl} onValueChange={setPageUrl} disabled={isLoading}>
                      <SelectTrigger id="sf-page">
                        <SelectValue placeholder="Select page…" />
                      </SelectTrigger>
                      <SelectContent>
                        {auditPages.map((p) => (
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
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sf-component" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Component
                  </Label>
                  <Input
                    id="sf-component"
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    placeholder="Navigation"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="sf-category" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label htmlFor="sf-wcag" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label htmlFor="sf-description" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label htmlFor="sf-recommendations" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Screenshot
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={chooseScreenshot}
                    disabled={isLoading}
                  >
                    <Image className="h-4 w-4" aria-hidden="true" />
                    {screenshotPath ? 'Change' : 'Add screenshot'}
                  </Button>
                  {screenshotPath && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-data text-xs text-muted-foreground truncate">
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
                <Label htmlFor="sf-notes" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #ebe7e7' }}
        >
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="finding-sidebar-form"
            disabled={isLoading || !title.trim()}
          >
            {isLoading
              ? mode === 'create' ? 'Adding…' : 'Saving…'
              : mode === 'create' ? 'Add finding' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  )
}
