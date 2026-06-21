import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

const inputBase =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

/** Text input carrying the shared field styling. Callers add modifiers (e.g. `font-mono`) via className. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...rest }, ref) {
    return <input ref={ref} type={type} className={cn(inputBase, className)} {...rest} />
  },
)
