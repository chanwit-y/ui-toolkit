import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

/** Text input carrying the shared `field` styling (28px, 6px radius, ink
 * focus ring). Callers add modifiers (e.g. `font-mono`) via className. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...rest }, ref) {
    return <input ref={ref} type={type} className={cn('field', className)} {...rest} />
  },
)
