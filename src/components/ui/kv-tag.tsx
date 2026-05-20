interface KVTagProps {
  label: string
  value: string
  valueVariant?: 'default' | 'pass' | 'fail'
  className?: string
}

const VALUE_STYLES = {
  default: { background: '#e9e9e9', color: '#1a1a1a' },
  pass:    { background: '#005503', color: '#ffffff' },
  fail:    { background: '#dc2626', color: '#ffffff' },
}

export function KVTag({ label, value, valueVariant = 'default', className = '' }: KVTagProps) {
  return (
    <div
      className={`inline-flex items-center font-sans font-bold flex-shrink-0 ${className}`}
      style={{ fontSize: '14px' }}
    >
      <span
        style={{
          background: '#d7d7d7',
          color: '#1a1a1a',
          padding: '3px 10px',
          borderRadius: '5px 0 0 5px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...VALUE_STYLES[valueVariant],
          padding: '3px 10px',
          borderRadius: '0 5px 5px 0',
        }}
      >
        {value}
      </span>
    </div>
  )
}
