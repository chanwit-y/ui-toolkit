import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  variant?: 'default' | 'primary'
  active?: boolean
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = 'default', active = false, children, className, ...rest },
    ref,
  ) {
    const variants = {
      default: active
        ? 'border-teal-500 bg-teal-50 text-teal-700'
        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',
      primary:
        'border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700',
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
          variants[variant],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
