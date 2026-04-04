import { useEffect, useState } from 'react'
import { Button } from './ui/button'

type UpdateState = 'idle' | 'available' | 'ready'

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle')

  useEffect(() => {
    window.api.update.onAvailable(() => setState('available'))
    window.api.update.onReady(() => setState('ready'))
  }, [])

  if (state === 'idle') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20 text-sm"
    >
      {state === 'available' ? (
        <span className="text-primary font-medium">Update downloading in the background…</span>
      ) : (
        <>
          <span className="text-primary font-medium">Update ready to install</span>
          <Button
            size="sm"
            variant="default"
            onClick={() => window.api.update.install()}
            className="h-7 text-xs"
          >
            Restart to update
          </Button>
        </>
      )}
    </div>
  )
}
