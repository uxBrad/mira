import { useState, useEffect, useCallback } from 'react'
import type { Finding } from '../../db/schema'

interface FindingWithStandards extends Omit<Finding, 'standards'> {
  standards: string[]
}

function deserializeFinding(f: Finding): FindingWithStandards {
  return {
    ...f,
    standards: f.standards ? JSON.parse(f.standards as string) : []
  }
}

export function useFindings(projectId: string) {
  const [findings, setFindings] = useState<FindingWithStandards[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.findings.list(projectId)
      setFindings(data.map(deserializeFinding))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const createFinding = useCallback(
    async (data: Parameters<typeof window.api.findings.create>[0]) => {
      const finding = await window.api.findings.create(data) as Finding
      await load()
      return deserializeFinding(finding)
    },
    [load]
  )

  const updateFinding = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const finding = await window.api.findings.update(id, data) as Finding
      await load()
      return deserializeFinding(finding)
    },
    [load]
  )

  const deleteFinding = useCallback(
    async (id: string) => {
      await window.api.findings.delete(id)
      await load()
    },
    [load]
  )

  return { findings, isLoading, error, reload: load, createFinding, updateFinding, deleteFinding }
}
