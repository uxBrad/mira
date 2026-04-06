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
import { STANDARDS_OPTIONS } from '../../lib/utils'

interface ProjectFormData {
  name: string
  clientName?: string
  url?: string
  description?: string
  status?: string
  standards?: string
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '')
      setClientName(initialData?.clientName || '')
      setUrl(initialData?.url || '')
      setDescription(initialData?.description || '')
      setStatus(initialData?.status || 'in_progress')
      setStandards(initialData?.standards || '')
      setError(null)
    }
  }, [open, initialData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        clientName: clientName.trim() || undefined,
        url: url.trim() || undefined,
        description: description.trim() || undefined,
        status,
        standards: standards || undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const title = mode === 'create' ? 'New audit project' : 'Edit project'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add details for your new accessibility audit project.'
              : 'Update project details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="project-form" noValidate aria-label={title}>
          {error && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">
                Project name <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="project-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ACME Corp Website Audit"
                aria-required="true"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-name">Client name</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="ACME Corporation"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-url">Website URL</Label>
              <Input
                id="project-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-description">Description / scope</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Audit scope, context, or notes about this project…"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-standards">Criteria / Standards</Label>
              <Select value={standards} onValueChange={setStandards} disabled={isLoading}>
                <SelectTrigger id="project-standards">
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

            {mode === 'edit' && (
              <div className="space-y-1.5">
                <Label htmlFor="project-status">Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                  <SelectTrigger id="project-status">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={isLoading || !name.trim()}>
            {isLoading
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
              ? 'Create project'
              : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
