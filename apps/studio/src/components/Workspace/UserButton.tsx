import { Modal } from '@gummy-ui/ui'
import { useState } from 'react'
import { cn } from '../common'
import { MOCK_USERS, useWorkspaceStore } from './workspaceStore'

/** Stable hue per name so avatars stay the same colour everywhere. */
export function nameHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/** The round initials avatar used by the user button, switcher and activity rows. */
export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.43),
        background: `hsl(${nameHue(name)} 16% 42%)`,
      }}
    >
      {initialsOf(name)}
    </span>
  )
}

/**
 * The topbar user pill (the mockup's `userBtn`) and its "Who is working?"
 * switcher: a mock identity with no auth behind it (see the grilled design) —
 * every activity line and template is stamped with the person picked here.
 */
export function UserButton() {
  const user = useWorkspaceStore((s) => s.user)
  const setUser = useWorkspaceStore((s) => s.setUser)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Switch who is working"
        className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface pl-1 pr-2 text-[12px] text-ink transition-colors hover:border-line-strong"
      >
        <Avatar name={user} size={20} />
        <span className="hidden sm:inline">{user}</span>
      </button>
      {open && (
        <Modal
          id="studio-switch-user"
          open
          onOpenChange={(o) => {
            if (!o) setOpen(false)
          }}
          title="Who is working?"
          description="Every change is recorded against the person selected here."
          width="380px"
        >
          <div className="flex flex-col gap-1 pt-2">
            {MOCK_USERS.map((u) => {
              const current = u.name === user
              return (
                <button
                  key={u.name}
                  type="button"
                  onClick={() => {
                    setUser(u.name)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-panel',
                    current ? 'border-line-strong bg-panel' : 'border-line',
                  )}
                >
                  <Avatar name={u.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-ui font-semibold text-ink">
                      {u.name}
                      {current && <span className="tag">signed in</span>}
                    </span>
                    <span className="block text-ui-xs text-ink-3">{u.role}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </>
  )
}
