interface EchoPillProps {
  variant: 'fail' | 'pass' | 'unknown' | 'level'
  label?: string
  className?: string
}

const STYLES = {
  fail:    { background: '#dc2626', color: '#ffffff' },
  pass:    { background: '#005503', color: '#ffffff' },
  unknown: { background: '#edc2b3', color: '#1a1a1a' },
  level:   { background: '#e5e2e1', color: '#1a1a1a' },
}

const DEFAULT_LABELS = {
  fail:    'FAIL',
  pass:    'PASS',
  unknown: 'UNKNOWN',
  level:   '',
}

export function EchoPill({ variant, label, className = '' }: EchoPillProps) {
  const text = label ?? DEFAULT_LABELS[variant]
  return (
    <span
      className={`inline-flex items-center font-sans font-bold whitespace-nowrap flex-shrink-0 ${className}`}
      style={{
        ...STYLES[variant],
        fontSize: '14px',
        padding: '3px 5px',
        borderRadius: '5px',
      }}
    >
      {text}
    </span>
  )
}
