import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-wide transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /* Primary: surgical red, sharp */
        default: 'bg-primary text-primary-foreground hover:bg-[#930100]',
        /* Destructive: same red family */
        destructive: 'bg-primary text-primary-foreground hover:bg-[#930100]',
        /* Outline: ghost border suggestion */
        outline:
          'border border-border bg-background hover:bg-muted hover:text-foreground',
        /* Secondary: surface-highest, understated */
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-surface-high',
        /* Ghost: invisible until hover */
        ghost: 'hover:bg-muted hover:text-foreground',
        /* Link: red text, no background */
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-[26px] px-4 py-0',
        sm: 'h-[22px] px-3 text-xs py-0',
        lg: 'h-[32px] px-8',
        icon: 'h-[26px] w-[26px]'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
