import { LayoutGrid, Boxes, Plug, SlidersHorizontal } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from './common'

const TABS = [
  { to: '/', label: 'Layout', icon: LayoutGrid, end: true },
  { to: '/model', label: 'Model', icon: Boxes, end: false },
  { to: '/api', label: 'API', icon: Plug, end: false },
  { to: '/env', label: 'Env', icon: SlidersHorizontal, end: false },
]

/**
 * The top-level chrome shared by every page: a brand + tab bar header, with the
 * routed page mounted below in a `flex-1 min-h-0` region so full-height editors
 * (the grid builder, the model editor) get the remaining viewport.
 */
export function AppShell() {
  return (
    <>
      <header className="flex shrink-0 items-center gap-6 border-b border-zinc-200 bg-white px-4">
        <span className="py-3 text-sm font-semibold text-zinc-800">Gummy Studio</span>
        <nav className="flex items-center gap-1">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800',
                )
              }
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </>
  )
}
