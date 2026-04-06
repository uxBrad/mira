import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
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
import { STANDARDS_OPTIONS } from '../../lib/utils'

interface ProjectFormData {
  name: string
  clientName?: string
  url?: string
  description?: string
  status?: string
  standards?: string
  auditUrls?: string[]
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  mode: 'create' | 'edit'
  initialData?: Partial<ProjectFormData>
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

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
      setError(null)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open, initialData])

  // Close on Escape
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
        auditUrls: cleanUrls.length > 0 ? cleanUrls : undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const title = mode === 'create' ? 'New audit project' : 'Edit project'

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          aria-hidden="true"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Left slide-in panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-[480px] flex flex-col overflow-hidden transition-transform duration-200"
        style={{
          background: '#fcf9f8',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid #ebe7e7'
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #ebe7e7' }}
        >
          <h2 className="font-semibold text-base tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={handleSubmit} id="project-sidebar-form" noValidate aria-label={title}>
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
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-name" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Project name <span aria-hidden="true" className="text-primary">*</span>
                </Label>
                <Input
                  id="ps-name"
                  ref={nameRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ACME Corp Website Audit"
                  aria-required="true"
                  disabled={isLoading}
                />
              </div>

              {/* Client name */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-client" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Client name
                </Label>
                <Input
                  id="ps-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ACME Corporation"
                  disabled={isLoading}
                />
              </div>

              {/* Website URL */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-url" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Website URL
                </Label>
                <Input
                  id="ps-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isLoading}
                />
              </div>

              {/* Standards */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-standards" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
                <Label className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Audit URLs
                </Label>
                <p className="font-data text-xs text-muted-foreground">
                  Add the page paths you&apos;ll be auditing (e.g. /home, /checkout)
                </p>
                <div className="space-y-2 mt-1">
                  {auditUrls.map((auditUrl, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={auditUrl}
                        onChange={(e) => updateAuditUrl(index, e.target.value)}
                        placeholder="/home"
                        disabled={isLoading}
                        aria-label={`Audit URL ${index + 1}`}
                      />
                      {auditUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuditUrl(index)}
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Remove URL ${index + 1}`}
                          disabled={isLoading}
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
                    className="font-data text-xs text-primary hover:underline underline-offset-4 flex items-center gap-1 mt-1"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Add more
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ps-description" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Description / scope
                </Label>
                <Textarea
                  id="ps-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Audit scope, context, or notes about this project…"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Status (edit only) */}
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ps-status" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
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
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #ebe7e7' }}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="project-sidebar-form"
            disabled={isLoading || !name.trim()}
          >
            {isLoading
              ? mode === 'create' ? 'Creating…' : 'Saving…'
              : mode === 'create' ? 'Create project' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  )
}
