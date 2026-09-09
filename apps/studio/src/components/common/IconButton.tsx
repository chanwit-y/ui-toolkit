import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  variant?: 'default' | 'primary'
  active?: boolean
  children: ReactNode
}

/** 28px square button in the mockup's `.btn.icon` style. `active` renders the
 * pressed (panel-2) state; `primary` is the solid ink button. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = 'default', active = false, children, className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={active || undefined}
        className={cn(
          'btn btn-icon',
          variant === 'primary' && 'btn-primary',
          active && 'border-line-strong bg-panel-2 text-ink',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
