interface KVTagProps {
  label: string
  value: string
  valueVariant?: 'default' | 'pass' | 'fail'
  className?: string
  stretch?: boolean
}

const VALUE_STYLES = {
  default: { background: '#f0ede9', color: '#5f5e5e' },
  pass:    { background: '#2d7a4f', color: '#ffffff' },
  fail:    { background: '#dc2626', color: '#ffffff' },
}

export function KVTag({ label, value, valueVariant = 'default', className = '', stretch = false }: KVTagProps) {
  return (
    <div
      className={`font-sans font-bold flex-shrink-0 ${className}`}
      style={{
        display: stretch ? 'flex' : 'inline-flex',
        alignItems: 'stretch',
        width: stretch ? '100%' : undefined,
        fontSize: '14px',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '5px',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          background: '#ede9e7',
          color: '#5f5e5e',
          padding: '3px 10px',
          display: 'flex',
          alignItems: 'center',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          ...(stretch ? { flex: 1 } : {}),
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...VALUE_STYLES[valueVariant],
          padding: '3px 8px',
          minWidth: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value}
      </span>
    </div>
  )
}
