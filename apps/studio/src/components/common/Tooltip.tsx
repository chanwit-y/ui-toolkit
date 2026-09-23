import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactElement, ReactNode } from 'react'

// The studio types React 19 while the hoisted Radix package resolves the root
// React 18 types, so a `ReactNode` doesn't cross into Radix's props; the two
// casts below are the whole boundary.
type RadixNode = Parameters<typeof RadixTooltip.Provider>[0]['children']

/** Wrap once around any region that uses `Tooltip` (one delay group per region). */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200}>{children as RadixNode}</RadixTooltip.Provider>
  )
}

/**
 * A hover / focus tooltip in the studio's ink tokens (a `bg-ink` chip with
 * `text-surface`, so it inverts with the appearance). The child is the
 * trigger (`asChild`, so it must forward its ref); needs a `TooltipProvider`
 * above.
 */
export function Tooltip({
  label,
  side = 'bottom',
  children,
}: {
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactElement
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children as RadixNode}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={4}
          collisionPadding={8}
          className="z-[100001] rounded-md bg-ink px-2 py-1 text-ui-xs font-medium text-surface shadow-md"
        >
          {label}
          <RadixTooltip.Arrow className="fill-ink" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
