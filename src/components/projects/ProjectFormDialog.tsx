import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Maximize2, Minimize2, Upload } from 'lucide-react'
import { EchoButton } from '../ui/echo-button'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { STANDARDS_OPTIONS } from '../../lib/utils'

interface ProjectFormData {
  name: string
  clientName?: string
  url?: string
  description?: string
  status?: string
  standards?: string
  auditUrls?: string[]
  clientLogoPath?: string | null
  auditorName?: string
  auditorCredentials?: string
  testingEnvironment?: string
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  mode: 'create' | 'edit'
  initialData?: Partial<ProjectFormData>
  isWide?: boolean
  onToggleWide?: () => void
}

const inputClass = 'w-full h-9 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]'
const inputStyle = { border: '1px solid #d0cac8' }

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  isWide = false,
  onToggleWide,
}: ProjectFormDialogProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [clientName, setClientName] = useState(initialData?.clientName || '')
  const [url, setUrl] = useState(initialData?.url || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [status, setStatus] = useState(initialData?.status || 'in_progress')
  const [standards, setStandards] = useState<string>(initialData?.standards || '')
  const [auditUrls, setAuditUrls] = useState<string[]>(
    initialData?.auditUrls && initialData.auditUrls.length > 0 ? initialData.auditUrls : ['']
  )
  const [clientLogoPath, setClientLogoPath] = useState<string | null>(initialData?.clientLogoPath ?? null)
  const [auditorName, setAuditorName] = useState(initialData?.auditorName || '')
  const [auditorCredentials, setAuditorCredentials] = useState(initialData?.auditorCredentials || '')
  const [testingEnvironment, setTestingEnvironment] = useState(initialData?.testingEnvironment || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setClientLogoPath(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Scroll state for body fade + indicator
  const bodyRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollThumb, setScrollThumb] = useState({ top: 0, height: 0 })

  function handleBodyScroll(e: React.UIEvent<HTMLDivElement>) {
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
  }

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '')
      setClientName(initialData?.clientName || '')
      setUrl(initialData?.url || '')
      setDescription(initialData?.description || '')
      setStatus(initialData?.status || 'in_progress')
      setStandards(initialData?.standards || '')
      setAuditUrls(
        initialData?.auditUrls && initialData.auditUrls.length > 0 ? initialData.auditUrls : ['']
      )
      setClientLogoPath(initialData?.clientLogoPath ?? null)
      setAuditorName(initialData?.auditorName || '')
      setAuditorCredentials(initialData?.auditorCredentials || '')
      setTestingEnvironment(initialData?.testingEnvironment || '')
      setError(null)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open, initialData])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  function updateAuditUrl(index: number, value: string) {
    setAuditUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
  }

  function addAuditUrl() {
    setAuditUrls((prev) => [...prev, ''])
  }

  function removeAuditUrl(index: number) {
    setAuditUrls((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : [''])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const cleanUrls = auditUrls.map((u) => u.trim()).filter(Boolean)
      await onSubmit({
        name: name.trim(),
        clientName: clientName.trim() || undefined,
        url: url.trim() || undefined,
        description: description.trim() || undefined,
        status,
        standards: standards || undefined,
        auditUrls: cleanUrls.length > 0 ? cleanUrls : undefined,
        clientLogoPath: clientLogoPath || null,
        auditorName: auditorName.trim() || undefined,
        auditorCredentials: auditorCredentials.trim() || undefined,
        testingEnvironment: testingEnvironment.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const heading = mode === 'create' ? 'New Project' : 'Edit Project'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#ffffff', borderLeft: '1px solid #e0dbd9' }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6"
        style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}
      >
        <span
          className="font-sans text-sm font-bold uppercase tracking-widest"
          style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}
        >
          {heading}
        </span>
        <div className="flex items-center gap-1">
          {onToggleWide && (
            <button
              type="button"
              onClick={onToggleWide}
              className="flex items-center justify-center transition-colors hover:text-foreground"
              style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
              aria-label={isWide ? 'Exit wide mode' : 'Enter wide mode'}
            >
              {isWide ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center transition-colors hover:text-foreground"
            style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Scrollable form body ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
          style={{ height: '48px', background: 'linear-gradient(to bottom, transparent, #ffffff)' }}
        />
        {/* Scroll indicator */}
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
          ref={bodyRef}
          className="no-scrollbar h-full overflow-y-auto px-6 py-5"
          onScroll={handleBodyScroll}
        >
          <form onSubmit={handleSubmit} id="project-sidebar-form" noValidate aria-label={heading}>
            {error && (
              <div
                role="alert"
                className="mb-4 px-3 py-2 font-sans text-sm"
                style={{ background: '#fef2f2', color: '#c0392b', border: '1px solid #fecaca' }}
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-name" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Project name <span aria-hidden="true" style={{ color: '#1d4ed8' }}>*</span>
                </Label>
                <input
                  id="ps-name"
                  ref={nameRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ACME Corp Website Audit"
                  aria-required="true"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Client name */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-client" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Client name
                </Label>
                <input
                  id="ps-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ACME Corporation"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Client Logo */}
              <div className="space-y-1.5">
                <Label className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Client Logo
                </Label>
                {clientLogoPath ? (
                  <div className="mb-2">
                    <div
                      className="flex items-center justify-center p-3 mb-2"
                      style={{ background: '#f6f3f2', borderRadius: '4px', minHeight: '80px' }}
                    >
                      <img
                        src={clientLogoPath}
                        alt="Client logo preview"
                        style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <EchoButton
                      icon={<X className="h-3.5 w-3.5" />}
                      iconPosition="right"
                      fullWidth
                      type="button"
                      disabled={isLoading}
                      onClick={() => setClientLogoPath(null)}
                      style={{ justifyContent: 'center', color: '#c0392b' }}
                    >
                      Remove
                    </EchoButton>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center p-5 mb-2"
                    style={{ background: '#f6f3f2', borderRadius: '4px', border: '1px dashed #d0cac8', minHeight: '80px' }}
                  >
                    <p className="font-sans text-xs" style={{ color: '#9a9897' }}>No logo uploaded</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Upload client logo"
                  onChange={handleLogoUpload}
                />
                <EchoButton
                  icon={<Upload className="h-3.5 w-3.5" />}
                  iconPosition="right"
                  fullWidth
                  type="button"
                  disabled={isLoading}
                  onClick={() => logoInputRef.current?.click()}
                  style={{ justifyContent: 'center' }}
                >
                  {clientLogoPath ? 'Replace Logo' : 'Choose Logo'}
                </EchoButton>
              </div>

              {/* Website URL */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-url" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Website URL
                </Label>
                <input
                  id="ps-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Standards */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-standards" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Criteria / Standards
                </Label>
                <Select value={standards} onValueChange={setStandards} disabled={isLoading}>
                  <SelectTrigger id="ps-standards">
                    <SelectValue placeholder="Select a standard…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARDS_OPTIONS.map((std) => (
                      <SelectItem key={std.value} value={std.value}>
                        {std.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audit URLs */}
              <div className="space-y-1.5">
                <Label className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Audit URLs
                </Label>
                <p className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
                  Add the page paths you&apos;ll be auditing (e.g. /home, /checkout)
                </p>
                <div className="space-y-2 mt-1">
                  {auditUrls.map((auditUrl, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={auditUrl}
                        onChange={(e) => updateAuditUrl(index, e.target.value)}
                        placeholder="/home"
                        disabled={isLoading}
                        aria-label={`Audit URL ${index + 1}`}
                        className={inputClass}
                        style={inputStyle}
                      />
                      {auditUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuditUrl(index)}
                          className="flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Remove URL ${index + 1}`}
                          disabled={isLoading}
                          style={{ width: '22px', height: '22px' }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAuditUrl}
                    disabled={isLoading}
                    className="font-sans text-xs text-primary hover:underline underline-offset-4 flex items-center gap-1 mt-1"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Add more
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-description" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Description / scope
                </Label>
                <textarea
                  id="ps-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Audit scope, context, or notes about this project…"
                  rows={3}
                  disabled={isLoading}
                  className="w-full px-3 py-2 font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] resize-none"
                  style={{ border: '1px solid #d0cac8' }}
                />
              </div>

              {/* Auditor info */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-auditor-name" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Auditor Name
                </Label>
                <input
                  id="ps-auditor-name"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  placeholder="Jane Smith"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ps-auditor-creds" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Auditor Credentials
                </Label>
                <input
                  id="ps-auditor-creds"
                  value={auditorCredentials}
                  onChange={(e) => setAuditorCredentials(e.target.value)}
                  placeholder="CPACC, DHS Trusted Tester"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ps-testing-env" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                  Testing Environment
                </Label>
                <p className="font-sans text-xs" style={{ color: '#5f5e5e' }}>
                  List AT tools, browsers, and OS used (e.g. NVDA 2024.1 + Chrome 120, Windows 11)
                </p>
                <textarea
                  id="ps-testing-env"
                  value={testingEnvironment}
                  onChange={(e) => setTestingEnvironment(e.target.value)}
                  placeholder="NVDA 2024.1 + Chrome 120 on Windows 11&#10;JAWS 2024 + Edge 120 on Windows 11&#10;VoiceOver + Safari on macOS 14"
                  rows={3}
                  disabled={isLoading}
                  className="w-full px-3 py-2 font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] resize-none"
                  style={{ border: '1px solid #d0cac8' }}
                />
              </div>

              {/* Status (edit only) */}
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ps-status" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                    <SelectTrigger id="ps-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bottom padding so last field clears the fade */}
              <div style={{ height: '32px' }} />
            </div>
          </form>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4"
        style={{ borderTop: '1px solid #e0dbd9', background: '#f6f3f2' }}
      >
        <EchoButton
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancel
        </EchoButton>
        <EchoButton
          variant="primary"
          type="submit"
          form="project-sidebar-form"
          disabled={isLoading || !name.trim()}
        >
          {isLoading
            ? mode === 'create' ? 'Creating…' : 'Saving…'
            : mode === 'create' ? 'Create Project' : 'Save Changes'}
        </EchoButton>
      </div>
    </div>
  )
}
