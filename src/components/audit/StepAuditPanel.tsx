import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Check, X, Clock, CheckCircle2, AlertCircle, ExternalLink, Maximize2, Minimize2, XCircle, Clipboard, Plus, Image } from 'lucide-react'
import { WCAG_CRITERIA, STANDARDS_OPTIONS } from '../../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Label } from '../ui/label'
import { EchoButton } from '../ui/echo-button'
import type { Template } from '../../hooks/useTemplates'

// ─── Brief descriptions for each WCAG criterion ──────────────────────────────
const CRITERION_DESCRIPTIONS: Record<string, string> = {
  '1.1.1': 'All non-text content (images, icons, charts, buttons) must have a text alternative that serves the equivalent purpose — so users of screen readers or other assistive technology can access the same information.',
  '1.2.1': 'For prerecorded audio-only or video-only content, provide a text transcript (audio-only) or audio description / text alternative (video-only) so users can access the content through another modality.',
  '1.2.2': 'Captions must be provided for all prerecorded audio content in synchronised media, enabling users who are deaf or hard of hearing to follow dialogue and important sounds.',
  '1.2.3': 'An audio description or full text alternative is provided for prerecorded video content in synchronised media.',
  '1.2.4': 'Captions are provided for all live audio content in synchronised media.',
  '1.2.5': 'Audio descriptions are provided for all prerecorded video content in synchronised media.',
  '1.3.1': 'Information, structure, and relationships conveyed through visual presentation can be programmatically determined or are available in text — e.g., headings, lists, tables, and form labels are marked up semantically.',
  '1.3.2': 'If the order in which content is presented affects its meaning, the reading sequence can be determined programmatically.',
  '1.3.3': 'Instructions do not rely solely on sensory characteristics such as shape, colour, size, visual location, or sound — e.g., "click the green button" must include more context.',
  '1.3.4': 'Content does not restrict its view and operation to a single display orientation unless a specific orientation is essential.',
  '1.3.5': 'The purpose of form fields that collect information about the user can be programmatically determined, enabling autofill and assistive tech to identify field intent.',
  '1.4.1': 'Colour is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.',
  '1.4.2': 'If audio plays automatically for more than 3 seconds, users must be able to pause, stop, or mute it independently of system volume.',
  '1.4.3': 'Text and images of text have a contrast ratio of at least 4.5:1 (3:1 for large text) against their background.',
  '1.4.4': 'Text can be resized without assistive technology up to 200% without loss of content or functionality.',
  '1.4.5': 'Images of text are not used to convey information unless the image is purely decorative or a specific visual presentation is essential.',
  '1.4.10': 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions for vertical scrolling content at a width of 320 CSS pixels.',
  '1.4.11': 'The visual presentation of non-text UI components and graphical objects has a contrast ratio of at least 3:1 against adjacent colours.',
  '1.4.12': 'No loss of content or functionality occurs when users change letter spacing, line height, word spacing, or spacing after paragraphs within defined limits.',
  '1.4.13': 'Where additional content appears on hover or focus, that content is dismissible, hoverable, and persistent.',
  '2.1.1': 'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes.',
  '2.1.2': 'If keyboard focus can be moved to a component using a keyboard interface, focus can be moved away using only the keyboard — preventing keyboard traps.',
  '2.1.4': 'Single-key shortcuts can be turned off, remapped, or activated only on focus to prevent accidental triggering.',
  '2.2.1': 'For each time limit set by the content, users can turn it off, adjust it, or extend it.',
  '2.2.2': 'For moving, blinking, scrolling, or auto-updating information, users can pause, stop, or hide it.',
  '2.3.1': 'Pages do not contain anything that flashes more than three times per second, or the flash is below the general flash and red flash thresholds.',
  '2.4.1': 'A mechanism exists to skip blocks of content that are repeated across multiple pages (e.g., a "skip to main content" link).',
  '2.4.2': 'Web pages and screens have titles that describe their topic or purpose.',
  '2.4.3': 'If a page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning.',
  '2.4.4': 'The purpose of each link can be determined from the link text alone, or from the link text together with its programmatically determined context.',
  '2.4.5': 'More than one way is available to locate a page within a set of pages, except where the page is a step in a process.',
  '2.4.6': 'Headings and labels describe the topic or purpose they represent.',
  '2.4.7': 'Any keyboard-operable interface has a visible keyboard focus indicator.',
  '2.4.11': 'Keyboard focus is not entirely hidden by author-created content when the component receives keyboard focus.',
  '2.5.1': 'All functionality that uses multipoint or path-based gestures can also be operated with a single pointer without a path-based gesture.',
  '2.5.2': 'For single pointer actions, at least one of the following is true: the down-event is not used; abort/undo is possible; the up-event reverses the down-event; completing the action on the down-event is essential.',
  '2.5.3': 'Where a component has a visible text label, the accessible name of the component contains the visible label text.',
  '2.5.4': 'Functionality that can be operated by device motion or user motion can also be operated by UI components.',
  '2.5.7': 'All functionality that uses a dragging movement can be achieved by a single pointer without dragging.',
  '2.5.8': 'The size of the target for pointer inputs is at least 24 × 24 CSS pixels.',
  '3.1.1': 'The default human language of each page can be programmatically determined (e.g., the <html lang="en"> attribute).',
  '3.1.2': 'The human language of each passage or phrase in the content can be programmatically determined.',
  '3.2.1': 'If a component receives focus, it does not automatically trigger a change of context.',
  '3.2.2': 'Changing the setting of any UI component does not automatically cause a change of context unless the user has been advised before using the component.',
  '3.2.3': 'Navigation mechanisms repeated across multiple pages occur in the same relative order each time they are repeated.',
  '3.2.4': 'Components that have the same functionality across multiple pages are identified consistently.',
  '3.2.6': 'Help mechanisms (human contact details, a help page, self-help options) are consistent across pages in a set.',
  '3.3.1': 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
  '3.3.2': 'Labels or instructions are provided when content requires user input.',
  '3.3.3': 'If an input error is automatically detected and suggestions for correction are known, then the suggestion is provided to the user.',
  '3.3.4': 'For pages that cause legal commitments or financial transactions, submissions can be reviewed, confirmed, and corrected before finalising.',
  '3.3.7': 'Information previously entered by or provided to the user is either auto-populated or available for the user to select when required again in the same process.',
  '3.3.8': 'A cognitive function test (e.g., solving a puzzle or remembering a password) is not required unless an alternative is provided.',
  '4.1.1': 'Content implemented using markup languages has elements with complete start and end tags, elements are nested according to their specifications, and IDs are unique.',
  '4.1.2': 'For all UI components, the name and role can be programmatically determined; states, properties, and values can be set; and user-agent notifications of changes are available.',
  '4.1.3': 'In content implemented using markup languages, status messages can be programmatically determined through role or property so they can be announced without receiving focus.',
}

// ─── Per-criterion audit status — two independent dimensions ────────────────
// Verdict: did this criterion pass or fail? (null = no verdict yet)
export type CriterionVerdict = 'pass' | 'fail' | null
// Progress: where is the audit work? (default: in_progress)
export type CriterionProgress = 'in_progress' | 'complete'
// Legacy alias kept for ReportPage compat
export type CriterionStatus = CriterionVerdict | CriterionProgress

interface Finding {
  id: string
  wcagCriterion: string | null
  status: string | null
  title: string
}

interface StepAuditPanelProps {
  onClose: () => void
  projectId: string
  auditPages?: string[]
  auditComponents?: string[]
  findings: Finding[]
  templates?: Template[]
  isWide?: boolean
  onToggleWide?: () => void
  navigateToCriterionId?: string
  onVerdictChange?: (verdicts: Record<string, 'pass' | 'fail'>) => void
  onAddFinding: (data: {
    projectId: string
    title: string
    description?: string
    wcagCriterion?: string
    wcagLevel?: string
    standards?: string[]
    severity?: string
    recommendations?: string
    pageUrl?: string
    component?: string
    screenshotPath?: string
  }) => Promise<void>
}

// Convert a WCAG criterion name to its URL slug
function toWcagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function StepAuditPanel({
  onClose,
  projectId,
  auditPages = [],
  auditComponents = [],
  findings,
  templates = [],
  isWide = false,
  onToggleWide,
  navigateToCriterionId,
  onVerdictChange,
  onAddFinding
}: StepAuditPanelProps) {
  const criteria = WCAG_CRITERIA as unknown as Array<{ id: string; name: string; level: string; category: string }>

  // Compute the storage key before any useState so the lazy initialisers can use it.
  const storageKey = `echo-step-audit-${projectId}`

  // ─── Initialise directly from localStorage (lazy initialisers run synchronously
  //     before the first paint, so there is no flash back to criterion 0) ────────
  const [index, setIndex] = useState<number>(() => {
    if (navigateToCriterionId) {
      const idx = criteria.findIndex(c => c.id === navigateToCriterionId)
      if (idx >= 0) return idx
    }
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const n = JSON.parse(saved)?.index
        if (typeof n === 'number' && n >= 0 && n < criteria.length) return n
      }
    } catch { /* ignore */ }
    return 0
  })

  // verdict: 'pass' | 'fail' | absent=null
  const [criteriaVerdict, setCriteriaVerdict] = useState<Record<string, 'pass' | 'fail'>>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const v = JSON.parse(saved)?.criteriaVerdict
        if (v && typeof v === 'object') return v
      }
    } catch { /* ignore */ }
    return {}
  })

  // progress: 'complete' | absent='in_progress'
  const [criteriaProgress, setCriteriaProgress] = useState<Partial<Record<string, 'complete'>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const p = JSON.parse(saved)?.criteriaProgress
        if (p && typeof p === 'object') return p
      }
    } catch { /* ignore */ }
    return {}
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // ─── Inline finding form state ────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [pageUrl, setPageUrl] = useState('__none__')
  const [component, setComponent] = useState('__none__')
  const [selectedTemplateId, setSelectedTemplateId] = useState('__none__')
  const [screenshotPath, setScreenshotPath] = useState('')

  // ─── Persist position + status whenever anything changes ────────────────
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ index, criteriaVerdict, criteriaProgress }))
    } catch { /* ignore – private browsing may block writes */ }
  }, [index, criteriaVerdict, criteriaProgress, storageKey])

  // ─── Notify parent immediately when verdicts change so grouped view updates ──
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    onVerdictChange?.(criteriaVerdict)
  }, [criteriaVerdict]) // onVerdictChange is stable from parent — intentionally omitted

  // ─── Navigate to a specific criterion when requested from outside ─────────
  useEffect(() => {
    if (!navigateToCriterionId) return
    const idx = criteria.findIndex(c => c.id === navigateToCriterionId)
    if (idx >= 0) setIndex(idx)
  }, [navigateToCriterionId]) // criteria is module-level stable — omitting from deps intentionally

  const criterion = criteria[index]
  const total = criteria.length

  // Findings logged for this criterion
  const criterionFindings = findings.filter(
    (f) => f.wcagCriterion === criterion.id
  )

  // Derive current two-dimensional status
  const hasFail = criterionFindings.some((f) => f.status !== 'resolved')
  // Verdict: auto-fail if active findings, otherwise use stored value
  const verdict: CriterionVerdict = hasFail ? 'fail' : (criteriaVerdict[criterion.id] ?? null)
  // Progress: stored value, default in_progress
  const progress: CriterionProgress = criteriaProgress[criterion.id] ?? 'in_progress'

  // Reset form when navigating
  useEffect(() => {
    setTitle('')
    setDescription('')
    setRecommendations('')
    setPageUrl('__none__')
    setComponent('__none__')
    setSelectedTemplateId('__none__')
    setScreenshotPath('')
    setSubmitSuccess(false)
  }, [index])

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    if (templateId === '__none__') {
      setTitle('')
      setDescription('')
      setRecommendations('')
      return
    }
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    setTitle(tpl.title)
    setDescription(tpl.description ?? '')
    setRecommendations(tpl.recommendations ?? '')
  }

  function setVerdict(v: 'pass' | 'fail') {
    setCriteriaVerdict((prev) => {
      // Toggle off if already selected (except when hasFail forces fail)
      if (prev[criterion.id] === v && !hasFail) {
        const next = { ...prev }
        delete next[criterion.id]
        return next
      }
      return { ...prev, [criterion.id]: v }
    })
  }

  function setProgress(p: CriterionProgress) {
    setCriteriaProgress((prev) => {
      if (p === 'in_progress') {
        const next = { ...prev }
        delete next[criterion.id]
        return next
      }
      return { ...prev, [criterion.id]: 'complete' }
    })
  }

  async function handleLogFinding() {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const matchingWcag = STANDARDS_OPTIONS
        .filter((s) => s.value.startsWith('WCAG') && s.value.endsWith(` ${criterion.level}`))
        .map((s) => s.value)
      await onAddFinding({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        wcagCriterion: criterion.id,
        wcagLevel: criterion.level,
        standards: matchingWcag,
        recommendations: recommendations.trim() || undefined,
        pageUrl: pageUrl && pageUrl !== '__none__' ? pageUrl : undefined,
        component: component && component !== '__none__' ? component : undefined,
        screenshotPath: screenshotPath || undefined,
      })
      setSubmitSuccess(true)
      setTitle('')
      setDescription('')
      setRecommendations('')
      setPageUrl('__none__')
      setComponent('__none__')
      setSelectedTemplateId('__none__')
      setScreenshotPath('')
      // Auto-mark verdict as fail when a finding is logged
      setCriteriaVerdict((prev) => ({ ...prev, [criterion.id]: 'fail' }))
      setTimeout(() => setSubmitSuccess(false), 2000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPct = Math.round(
    (Object.values(criteriaProgress).filter((p) => p === 'complete').length / total) * 100
  )

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#ffffff', borderLeft: '1px solid #e0dbd9' }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between pl-6 pr-3"
        style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-sans text-sm font-bold uppercase tracking-widest" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>
            Step-by-Step Audit
          </span>
          <span className="font-sans text-sm font-semibold" style={{ color: '#3a3a3a' }}>
            {index + 1} / {total}
          </span>
          {/* Progress bar — sits right next to step counter */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5" style={{ background: '#e0dbd9' }}>
              <div
                className="h-full transition-all"
                style={{ width: `${progressPct}%`, background: '#2d7a4f' }}
              />
            </div>
            <span className="font-sans text-xs" style={{ color: '#3a3a3a' }}>{progressPct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleWide}
            className="flex items-center justify-center transition-colors hover:text-foreground"
            style={{ color: '#5f5e5e', width: '32px', height: '32px', borderRadius: '4px' }}
            aria-label={isWide ? 'Exit wide mode' : 'Enter wide mode'}
          >
            {isWide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:text-foreground"
            style={{ color: '#5f5e5e', width: '32px', height: '32px', borderRadius: '4px' }}
            aria-label="Close step audit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Criterion header ── */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid #e0dbd9' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-sans text-xs font-bold uppercase tracking-widest"
                  style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}
                >
                  Criteria {criterion.id}
                </span>
                <span
                  className="font-sans text-xs font-bold px-1.5 py-0.5 uppercase"
                  style={{ background: '#f0ede9', color: '#3a3a3a', letterSpacing: '0.06em' }}
                >
                  Level {criterion.level}
                </span>
              </div>
              <h2
                className="font-serif font-bold leading-tight mb-3"
                style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#1a1a1a' }}
              >
                {criterion.name}
              </h2>
              <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#3a3a3a' }}>
                {CRITERION_DESCRIPTIONS[criterion.id] ?? 'Review this criterion against the content and interactions on the page.'}
              </p>
              {/* WCAG reference links */}
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={`https://www.w3.org/WAI/WCAG22/Understanding/${toWcagSlug(criterion.name)}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-sans text-xs font-semibold hover:underline"
                  style={{ color: '#1d4ed8' }}
                >
                  Understanding {criterion.id}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <a
                  href={`https://www.w3.org/WAI/WCAG22/quickref/#${toWcagSlug(criterion.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-sans text-xs font-semibold hover:underline"
                  style={{ color: '#1d4ed8' }}
                >
                  How to Meet
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Status badges — two independent dimensions */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {verdict === 'pass' && (
                <span className="flex items-center gap-1 font-sans text-xs font-bold px-2.5 py-1 uppercase" style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.08em', borderRadius: '20px' }}>
                  <CheckCircle2 className="h-3 w-3" /> Pass
                </span>
              )}
              {verdict === 'fail' && (
                <span className="flex items-center gap-1 font-sans text-xs font-bold px-2.5 py-1 uppercase" style={{ background: '#dc2626', color: '#fff', letterSpacing: '0.08em', borderRadius: '20px' }}>
                  <AlertCircle className="h-3 w-3" /> Fail {criterionFindings.length > 0 && `(${criterionFindings.length})`}
                </span>
              )}
              {progress === 'complete' ? (
                <span className="flex items-center gap-1 font-sans text-xs font-bold px-2.5 py-1 uppercase" style={{ background: '#2d7a4f', color: '#fff', letterSpacing: '0.08em', borderRadius: '20px' }}>
                  <Check className="h-3 w-3" /> Complete
                </span>
              ) : (
                <span className="flex items-center gap-1 font-sans text-xs font-bold px-2.5 py-1 uppercase" style={{ background: '#e5e2e1', color: '#5f5e5e', letterSpacing: '0.08em', borderRadius: '20px' }}>
                  <Clock className="h-3 w-3" /> In Progress
                </span>
              )}
            </div>
          </div>

          {/* Existing findings for this criterion */}
          {criterionFindings.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="font-sans text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Logged Findings
              </p>
              {criterionFindings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ background: '#f6f3f2' }}
                >
                  <span
                    className="font-sans text-xs font-bold uppercase px-1.5 py-0.5 flex-shrink-0"
                    style={{
                      background: f.status === 'resolved' ? '#2d7a4f' : '#dc2626',
                      color: '#fff',
                      letterSpacing: '0.08em',
                      borderRadius: '20px',
                    }}
                  >
                    {f.status === 'resolved' ? 'Pass' : 'Fail'}
                  </span>
                  <span className="font-sans text-sm truncate" style={{ color: '#2b2c2c' }}>{f.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Log a Finding form ── */}
        <div className="px-6 py-5">
          <p className="font-sans text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
            Log a Finding
          </p>

          {submitSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 font-sans text-sm" style={{ background: '#eaf6ee', color: '#2d7a4f' }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Finding logged successfully
            </div>
          )}

          <div className="space-y-4">
            {/* Title + template (side by side) */}
            <div>
              <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Issue Title
              </Label>
              <div className="flex items-center gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${criterion.name} issue…`}
                  className="flex-1 h-9 px-3 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  style={{ borderColor: '#d0cac8' }}
                />
                {templates.length > 0 && (
                  <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                    <SelectTrigger style={{ width: '140px', height: '36px', fontSize: '12px', flexShrink: 0 }}>
                      <SelectValue placeholder="Template…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No template</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Description
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what fails and why it's an issue…"
                rows={3}
                className="w-full px-3 py-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                style={{ borderColor: '#d0cac8' }}
              />
            </div>

            {/* Recommendations */}
            <div>
              <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Recommendation
              </Label>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="How should this be fixed?"
                rows={2}
                className="w-full px-3 py-2 font-sans text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                style={{ borderColor: '#d0cac8' }}
              />
            </div>

            {/* Page + Component */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Page
                </Label>
                {auditPages.length > 0 ? (
                  <Select value={pageUrl} onValueChange={setPageUrl}>
                    <SelectTrigger className="h-8 text-xs font-sans">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {auditPages.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    placeholder="/home"
                    className="w-full h-8 px-3 font-sans text-xs border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ borderColor: '#d0cac8' }}
                  />
                )}
              </div>
              <div>
                <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Component
                </Label>
                {auditComponents.length > 0 ? (
                  <Select value={component} onValueChange={setComponent}>
                    <SelectTrigger className="h-8 text-xs font-sans">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {auditComponents.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    placeholder="Nav, Hero…"
                    className="w-full h-8 px-3 font-sans text-xs border bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ borderColor: '#d0cac8' }}
                  />
                )}
              </div>
            </div>

            {/* Screenshot */}
            <div>
              <Label className="font-sans text-xs font-bold uppercase tracking-widest mb-1.5 block" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                Screenshot
              </Label>
              <div className="flex items-center gap-2">
                <EchoButton
                  icon={<Image className="h-3.5 w-3.5" />}
                  iconPosition="left"
                  onClick={async () => {
                    const path = await window.api.export.chooseScreenshot()
                    if (path) setScreenshotPath(path)
                  }}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  {screenshotPath ? 'Change' : 'Add Screenshot'}
                </EchoButton>
                <EchoButton
                  icon={<Clipboard className="h-3.5 w-3.5" />}
                  iconPosition="left"
                  onClick={async () => {
                    try {
                      const filePath = await window.api.system.readClipboardImage()
                      if (filePath) setScreenshotPath(filePath)
                    } catch { /* silent */ }
                  }}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  Paste from Clipboard
                </EchoButton>
              </div>
              {screenshotPath && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="font-sans text-xs truncate" style={{ color: '#5f5e5e' }}>
                    {screenshotPath.split('/').pop() || screenshotPath.split('\\').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScreenshotPath('')}
                    aria-label="Remove screenshot"
                    className="flex-shrink-0"
                  >
                    <X className="h-3 w-3" style={{ color: '#9a9897' }} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit finding */}
            <EchoButton
              variant="primary"
              fullWidth
              icon={<Plus className="h-4 w-4" />}
              iconPosition="left"
              onClick={handleLogFinding}
              disabled={isSubmitting}
              style={{ justifyContent: 'center' }}
            >
              {isSubmitting ? 'Logging…' : 'Log Finding'}
            </EchoButton>
          </div>
        </div>
      </div>

      {/* ── Footer: navigation + status controls centered ── */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Previous */}
          <EchoButton
            icon={<ChevronLeft className="h-4 w-4" />}
            iconPosition="left"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            Prev
          </EchoButton>

          {/* Status buttons — two independent groups */}
          <div className="flex items-center gap-1.5 justify-center">
            {/* Verdict group */}
            <div className="relative group">
              <EchoButton
                icon={<CheckCircle2 className="h-3 w-3" />}
                iconPosition="left"
                onClick={() => setVerdict('pass')}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  background: verdict === 'pass' ? '#2d7a4f' : 'transparent',
                  color: verdict === 'pass' ? '#fff' : '#2d7a4f',
                  border: '1px solid #2d7a4f',
                }}
              >
                Pass
              </EchoButton>
              {hasFail && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
                  style={{ background: '#1a1a1a', color: '#fff', fontSize: '11px', borderRadius: '4px', fontFamily: 'var(--font-sans)' }}
                  role="tooltip"
                >
                  Can't mark as passed because of logged failures
                </div>
              )}
            </div>
            <EchoButton
              icon={<XCircle className="h-3 w-3" />}
              iconPosition="left"
              onClick={() => setVerdict('fail')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: verdict === 'fail' ? '#dc2626' : 'transparent',
                color: verdict === 'fail' ? '#fff' : '#dc2626',
                border: '1px solid #dc2626',
              }}
            >
              Fail
            </EchoButton>

            {/* Divider */}
            <span style={{ width: '1px', height: '24px', background: '#d0cac8', flexShrink: 0 }} aria-hidden="true" />

            {/* Progress group */}
            <EchoButton
              icon={<Clock className="h-3 w-3" />}
              iconPosition="left"
              onClick={() => setProgress('in_progress')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: progress === 'in_progress' ? '#8b6914' : 'transparent',
                color: progress === 'in_progress' ? '#fff' : '#8b6914',
                border: '1px solid #8b6914',
              }}
            >
              In Progress
            </EchoButton>
            <EchoButton
              icon={<Check className="h-3 w-3" />}
              iconPosition="left"
              onClick={() => setProgress('complete')}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: progress === 'complete' ? '#2d7a4f' : 'transparent',
                color: progress === 'complete' ? '#fff' : '#2d7a4f',
                border: '1px solid #2d7a4f',
              }}
            >
              Complete
            </EchoButton>
          </div>

          {/* Next */}
          <EchoButton
            variant="primary"
            icon={<ChevronRight className="h-4 w-4" />}
            iconPosition="right"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            Next
          </EchoButton>
        </div>
      </div>
    </div>
  )
}
