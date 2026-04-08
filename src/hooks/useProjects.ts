import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../../db/schema'

interface ProjectWithCount extends Project {
  findingCount: number
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.projects.list()
      setProjects(data as unknown as ProjectWithCount[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createProject = useCallback(
    async (data: { name: string; clientName?: string; url?: string; description?: string; standards?: string; auditUrls?: string[] }) => {
      const project = await window.api.projects.create(data)
      await load()
      return project
    },
    [load]
  )

  const updateProject = useCallback(
    async (
      id: string,
      data: { name?: string; clientName?: string; url?: string; description?: string; status?: string; standards?: string; auditUrls?: string[] }
    ) => {
      const project = await window.api.projects.update(id, data)
      await load()
      return project
    },
    [load]
  )

  const deleteProject = useCallback(
    async (id: string) => {
      await window.api.projects.delete(id)
      await load()
    },
    [load]
  )

  return { projects, isLoading, error, reload: load, createProject, updateProject, deleteProject }
}
