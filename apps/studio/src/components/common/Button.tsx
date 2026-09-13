import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary'
  size?: 'md' | 'sm'
  children: ReactNode
}

/** Text button in the mockup's `.btn` style (28px; `sm` = 24px). Put an icon
 * before the label as a child — the flex gap spaces it. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        size === 'sm' && 'btn-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
