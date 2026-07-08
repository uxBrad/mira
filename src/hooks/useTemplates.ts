import { useState, useEffect, useCallback } from 'react'

export interface Template {
  id: string
  title: string
  description: string | null
  wcagCriterion: string | null
  wcagLevel: string | null
  standards: string[]
  category: string | null
  recommendations: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.templates.list()
      setTemplates(data as Template[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createTemplate = useCallback(
    async (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
      const template = await window.api.templates.create(data as Parameters<typeof window.api.templates.create>[0])
      await load()
      return template as Template
    },
    [load]
  )

  const updateTemplate = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const template = await window.api.templates.update(id, data)
      await load()
      return template as Template
    },
    [load]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      await window.api.templates.delete(id)
      await load()
    },
    [load]
  )

  return { templates, isLoading, error, reload: load, createTemplate, updateTemplate, deleteTemplate }
}
