import { forwardRef } from 'react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface EchoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const EchoButton = forwardRef<HTMLButtonElement, EchoButtonProps>(
  (
    {
      variant = 'secondary',
      icon,
      iconPosition = 'right',
      fullWidth = false,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center gap-[10px] font-sans text-base transition-opacity',
          'hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#610000]',
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          padding: '10px 15px',
          borderRadius: '5px',
          border: '1px solid #5f5e80',
          background: variant === 'primary' ? '#610000' : '#fcf9f8',
          color: variant === 'primary' ? '#ffffff' : '#1a1a1a',
          ...style,
        }}
        {...props}
      >
        {iconPosition === 'left' && icon && (
          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6" aria-hidden="true">
            {icon}
          </span>
        )}
        {children != null && (
          <span className="flex-1 min-w-0 text-left leading-normal">{children}</span>
        )}
        {iconPosition === 'right' && icon && (
          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    )
  }
)

EchoButton.displayName = 'EchoButton'
