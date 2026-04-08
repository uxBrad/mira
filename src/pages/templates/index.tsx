import { useState, useRef, useEffect } from 'react'
import { Plus, X, Pencil, Trash2, AlertCircle, FileText } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'
import { WCAG_CRITERIA, SEVERITY_OPTIONS, CATEGORY_OPTIONS, STANDARDS_OPTIONS } from '../../lib/utils'
import { useTemplates, Template } from '../../hooks/useTemplates'
import { useToast } from '../../components/ui/use-toast'

interface TemplateFormData {
  title: string
  description?: string
  wcagCriterion?: string
  wcagLevel?: string
  standards?: string[]
  category?: string
  severity?: string
  recommendations?: string
  notes?: string
}

function TemplateFormSidebar({
  open,
  onClose,
  onSubmit,
  mode,
  initialData
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: TemplateFormData) => Promise<void>
  mode: 'create' | 'edit'
  initialData?: Partial<TemplateFormData>
}) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [wcagCriterion, setWcagCriterion] = useState(initialData?.wcagCriterion || '')
  const [wcagLevel, setWcagLevel] = useState(initialData?.wcagLevel || '')
  const [standards, setStandards] = useState<string[]>(initialData?.standards || [])
  const [category, setCategory] = useState(initialData?.category || '')
  const [severity, setSeverity] = useState(initialData?.severity || 'moderate')
  const [recommendations, setRecommendations] = useState(initialData?.recommendations || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [criterionSearch, setCriterionSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setRecommendations(initialData?.recommendations || '')
      setNotes(initialData?.notes || '')
      setCriterionSearch('')
      setError(null)
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
        title: title.trim(),
        description: description.trim() || undefined,
        wcagCriterion: wcagCriterion || undefined,
        wcagLevel: wcagLevel || undefined,
        standards: standards.length > 0 ? standards : undefined,
        category: category || undefined,
        severity,
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

  const heading = mode === 'create' ? 'New finding template' : 'Edit template'

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" aria-hidden="true" onClick={onClose} />
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
          <form onSubmit={handleSubmit} id="template-form" noValidate>
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
              <div className="space-y-1.5">
                <Label htmlFor="tf-title" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Title <span aria-hidden="true" className="text-primary">*</span>
                </Label>
                <Input
                  id="tf-title"
                  ref={titleRef}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Images missing alternative text"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tf-severity" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Severity
                  </Label>
                  <Select value={severity} onValueChange={setSeverity} disabled={isLoading}>
                    <SelectTrigger id="tf-severity">
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
                  <Label htmlFor="tf-category" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Category
                  </Label>
                  <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                    <SelectTrigger id="tf-category">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tf-wcag" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  WCAG Criterion
                </Label>
                <div className="relative">
                  <Input
                    id="tf-wcag"
                    value={wcagCriterion
                      ? `${wcagCriterion} — ${WCAG_CRITERIA.find(c => c.id === wcagCriterion)?.name || ''}`
                      : criterionSearch}
                    onChange={(e) => {
                      setWcagCriterion('')
                      setCriterionSearch(e.target.value)
                    }}
                    placeholder="Search by number or name"
                    disabled={isLoading}
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
                    className="border divide-y shadow-md max-h-48 overflow-y-auto"
                    style={{ background: '#fcf9f8', borderColor: '#ebe7e7' }}
                    role="listbox"
                  >
                    {filteredCriteria.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#ebe7e7] flex items-center justify-between"
                          onClick={() => handleCriterionSelect(c)}
                        >
                          <span>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{c.id}</span>
                            {c.name}
                          </span>
                          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">{c.level}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="tf-description" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Issue description
                </Label>
                <Textarea
                  id="tf-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the accessibility issue…"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tf-recommendations" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Recommendation
                </Label>
                <Textarea
                  id="tf-recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="How to fix this issue…"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tf-notes" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="tf-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes, references…"
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
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" form="template-form" disabled={isLoading || !title.trim()}>
            {isLoading
              ? mode === 'create' ? 'Creating…' : 'Saving…'
              : mode === 'create' ? 'Create template' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  )
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor'
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#c0392b',
  serious: '#c0392b',
  moderate: '#8b6914',
  minor: '#2d7a4f'
}

export default function TemplatesPage() {
  const { templates, isLoading, error, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleCreate(data: TemplateFormData) {
    await createTemplate(data as Omit<Template, 'id' | 'createdAt' | 'updatedAt'>)
    setCreateOpen(false)
    toast({ title: 'Template created' })
  }

  async function handleEdit(data: TemplateFormData) {
    if (!editTemplate) return
    await updateTemplate(editTemplate.id, data as unknown as Record<string, unknown>)
    setEditTemplate(null)
    toast({ title: 'Template updated' })
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteTemplate(deleteConfirm.id)
      setDeleteConfirm(null)
      toast({ title: 'Template deleted' })
    } catch {
      toast({ variant: 'destructive', title: 'Delete failed' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-10 py-10">
        <div className="mb-10">
          <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
            Reusable findings
          </p>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Finding Templates
          </h1>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-primary px-4 py-3 mb-6" style={{ background: '#ebe7e7' }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="font-data text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-px" aria-busy="true" aria-label="Loading templates">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse" style={{ background: '#ebe7e7' }} aria-hidden="true" />
            ))}
          </div>
        )}

        {!isLoading && templates.length === 0 && !error && (
          <div className="py-24">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" aria-hidden="true" />
            <h2 className="font-semibold text-lg mb-1">No templates yet</h2>
            <p className="font-data text-sm text-muted-foreground mb-6 max-w-xs">
              Create reusable finding templates to speed up your audits.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New template
            </Button>
          </div>
        )}

        {!isLoading && templates.length > 0 && (
          <ul className="space-y-0" role="list" aria-label="Finding templates" style={{ paddingBottom: '2rem' }}>
            {templates.map((template) => (
              <li key={template.id} className="mb-4">
                <article
                  className="p-5"
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.06)'
                  }}
                  aria-label={template.title}
                >
                  {/* Top row: severity + level | criterion + actions */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {template.severity && (
                        <span
                          className="font-sans text-xs font-semibold"
                          style={{ color: SEVERITY_COLORS[template.severity] ?? '#5f5e5e' }}
                        >
                          {SEVERITY_LABELS[template.severity] ?? template.severity}
                        </span>
                      )}
                      {template.wcagLevel && (
                        <span
                          className="font-sans text-xs font-semibold uppercase"
                          style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}
                        >
                          · Level {template.wcagLevel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {template.wcagCriterion && (
                        <span className="font-serif italic text-sm" style={{ color: '#5f5e5e' }}>
                          Criterion {template.wcagCriterion}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditTemplate(template)}
                          aria-label={`Edit: ${template.title}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 font-sans text-xs font-medium transition-colors hover:bg-[#f6f3f2]"
                          style={{ border: '1px solid #d0cac8', color: '#5f5e5e', borderRadius: '4px' }}
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(template)}
                          aria-label={`Delete: ${template.title}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 font-sans text-xs font-medium transition-colors hover:bg-red-50"
                          style={{ border: '1px solid #d0cac8', color: '#c0392b', borderRadius: '4px' }}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-serif font-bold leading-snug mb-2"
                    style={{ fontSize: '1.1rem', letterSpacing: '-0.01em', color: '#1a1a1a' }}
                  >
                    {template.title}
                  </h3>

                  {/* Description */}
                  {template.description && (
                    <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#5f5e5e' }}>
                      {template.description}
                    </p>
                  )}

                  {/* Recommendation */}
                  {template.recommendations && (
                    <div className="mb-3" style={{ borderLeft: '3px solid #610000', paddingLeft: '12px' }}>
                      <p className="font-sans text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#610000', letterSpacing: '0.1em' }}>
                        Recommendation
                      </p>
                      <p className="font-sans text-sm leading-relaxed" style={{ color: '#2b2c2c' }}>
                        {template.recommendations}
                      </p>
                    </div>
                  )}

                  {/* Footer chips */}
                  {template.standards.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3" style={{ borderTop: '1px solid #f0ede9' }}>
                      {template.standards.map((s) => (
                        <span key={s} className="font-sans text-xs px-2 py-0.5" style={{ background: '#f6f3f2', color: '#5f5e5e', borderRadius: '3px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right panel */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col px-7 py-10 overflow-y-auto"
        style={{ background: '#f6f3f2' }}
        aria-label="Template actions"
      >
        <Button onClick={() => setCreateOpen(true)} className="w-full mb-4">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New template
        </Button>
        {templates.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #ebe7e7' }}>
            <p className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Summary
            </p>
            <dl>
              <dt className="font-data text-xs text-muted-foreground">Total templates</dt>
              <dd className="font-data text-2xl font-bold text-foreground">{templates.length}</dd>
            </dl>
          </div>
        )}
      </aside>

      {/* Create sidebar */}
      <TemplateFormSidebar
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit sidebar */}
      <TemplateFormSidebar
        open={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        onSubmit={handleEdit}
        mode="edit"
        initialData={editTemplate ? {
          title: editTemplate.title,
          description: editTemplate.description ?? undefined,
          wcagCriterion: editTemplate.wcagCriterion ?? undefined,
          wcagLevel: editTemplate.wcagLevel ?? undefined,
          standards: editTemplate.standards,
          category: editTemplate.category ?? undefined,
          severity: editTemplate.severity ?? undefined,
          recommendations: editTemplate.recommendations ?? undefined,
          notes: editTemplate.notes ?? undefined
        } : undefined}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteConfirm?.title}&rdquo; will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
