import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full bg-surface-highest px-3 py-2 text-sm font-data text-foreground',
          'border-0 border-b-2 border-transparent',
          'placeholder:text-muted-foreground',
          'transition-colors duration-150',
          'focus:outline-none focus:border-b-primary',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
