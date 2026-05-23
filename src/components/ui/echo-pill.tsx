interface EchoPillProps {
  variant: 'fail' | 'pass' | 'unknown' | 'level'
  label?: string
  className?: string
}

const STYLES = {
  fail:    { background: '#dc2626', color: '#ffffff' },
  pass:    { background: '#2d7a4f', color: '#ffffff' },
  unknown: { background: '#edc2b3', color: '#1a1a1a' },
  level:   { background: '#f0ede9', color: '#5f5e5e' },
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
        border: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {text}
    </span>
  )
}
