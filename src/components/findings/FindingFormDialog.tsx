import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'
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
import { WCAG_CRITERIA, CATEGORY_OPTIONS, STANDARDS_OPTIONS } from '../../lib/utils'
import { X, Image } from 'lucide-react'

interface FindingFormData {
  projectId: string
  title: string
  description?: string
  wcagCriterion?: string
  wcagLevel?: string
  standards?: string[]
  category?: string
  status?: string
  pageUrl?: string
  screenshotPath?: string
  recommendations?: string
  notes?: string
}

interface FindingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: FindingFormData) => Promise<void>
  mode: 'create' | 'edit'
  projectId: string
  initialData?: Partial<FindingFormData>
}

export function FindingFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  projectId,
  initialData
}: FindingFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [wcagCriterion, setWcagCriterion] = useState(initialData?.wcagCriterion || '')
  const [wcagLevel, setWcagLevel] = useState(initialData?.wcagLevel || '')
  const [standards, setStandards] = useState<string[]>(initialData?.standards || [])
  const [category, setCategory] = useState(initialData?.category || '')
  const [status, setStatus] = useState(initialData?.status || 'open')
  const [pageUrl, setPageUrl] = useState(initialData?.pageUrl || '')
  const [screenshotPath, setScreenshotPath] = useState(initialData?.screenshotPath || '')
  const [recommendations, setRecommendations] = useState(initialData?.recommendations || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [criterionSearch, setCriterionSearch] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '')
      setDescription(initialData?.description || '')
      setWcagCriterion(initialData?.wcagCriterion || '')
      setWcagLevel(initialData?.wcagLevel || '')
      setStandards(initialData?.standards || [])
      setCategory(initialData?.category || '')
      setStatus(initialData?.status || 'open')
      setPageUrl(initialData?.pageUrl || '')
      setScreenshotPath(initialData?.screenshotPath || '')
      setRecommendations(initialData?.recommendations || '')
      setNotes(initialData?.notes || '')
      setError(null)
      setCriterionSearch('')
    }
  }, [open])

  function handleCriterionSelect(criterion: typeof WCAG_CRITERIA[number]) {
    setWcagCriterion(criterion.id)
    setWcagLevel(criterion.level)
    setCategory(criterion.category)
    setCriterionSearch('')
  }

  function toggleStandard(std: string) {
    setStandards((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std]
    )
  }

  async function chooseScreenshot() {
    const path = await window.api.export.chooseScreenshot()
    if (path) {
      setScreenshotPath(path)
    }
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
        status,
        pageUrl: pageUrl.trim() || undefined,
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

  const title_str = mode === 'create' ? 'Add finding' : 'Edit finding'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title_str}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Log an accessibility issue found in this audit.'
              : 'Update the details of this finding.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="finding-form" noValidate aria-label={title_str}>
          {error && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-title">
                Title <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="finding-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Images missing alternative text"
                disabled={isLoading}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                <SelectTrigger id="finding-status">
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

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger id="finding-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* WCAG criterion */}
            <div className="space-y-1.5">
              <Label htmlFor="wcag-search">WCAG Criterion</Label>
              <div className="relative">
                <Input
                  id="wcag-search"
                  value={wcagCriterion ? `${wcagCriterion} — ${WCAG_CRITERIA.find(c => c.id === wcagCriterion)?.name || ''}` : criterionSearch}
                  onChange={(e) => {
                    setWcagCriterion('')
                    setCriterionSearch(e.target.value)
                  }}
                  placeholder="Search by number or name (e.g. 1.1.1 or contrast)"
                  disabled={isLoading}
                  aria-autocomplete="list"
                  aria-controls="criterion-list"
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
                  id="criterion-list"
                  className="border rounded-md divide-y bg-popover shadow-md max-h-48 overflow-y-auto"
                  role="listbox"
                  aria-label="WCAG criteria suggestions"
                >
                  {filteredCriteria.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
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
              <Label>Standards</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select applicable standards">
                {STANDARDS_OPTIONS.map((std) => (
                  <button
                    key={std.value}
                    type="button"
                    onClick={() => toggleStandard(std.value)}
                    aria-pressed={standards.includes(std.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      standards.includes(std.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-accent'
                    }`}
                    disabled={isLoading}
                  >
                    {std.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-description">Issue description</Label>
              <Textarea
                id="finding-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the accessibility issue…"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-recommendations">Recommendation</Label>
              <Textarea
                id="finding-recommendations"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="How to fix this issue…"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Page URL */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-url">Page URL</Label>
              <Input
                id="finding-url"
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://example.com/page"
                disabled={isLoading}
              />
            </div>

            {/* Screenshot */}
            <div className="space-y-1.5">
              <Label>Screenshot</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={chooseScreenshot}
                  disabled={isLoading}
                >
                  <Image className="h-4 w-4" aria-hidden="true" />
                  {screenshotPath ? 'Change screenshot' : 'Add screenshot'}
                </Button>
                {screenshotPath && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground truncate max-w-xs">
                      {screenshotPath.split('/').pop() || screenshotPath.split('\\').pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setScreenshotPath('')}
                      aria-label="Remove screenshot"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="finding-notes">Notes</Label>
              <Textarea
                id="finding-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, references, links…"
                rows={2}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="finding-form" disabled={isLoading || !title.trim()}>
            {isLoading
              ? mode === 'create'
                ? 'Adding…'
                : 'Saving…'
              : mode === 'create'
              ? 'Add finding'
              : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
