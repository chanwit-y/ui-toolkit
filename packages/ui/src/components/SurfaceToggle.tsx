import { IconButton } from "@radix-ui/themes"
import { Layers, Square } from "lucide-react"
import { useTheme } from "./context/ThemeProvider"

export type SurfaceToggleProps = {
  /** Radix IconButton size. */
  size?: "1" | "2" | "3" | "4"
  /** Radix IconButton variant. */
  variant?: "classic" | "solid" | "soft" | "surface" | "outline" | "ghost"
  className?: string
}

/**
 * Flat / glass surface toggle — the `ThemeToggle`'s sibling for the surface
 * token (see the grilled design `glass-surface`). A runtime override only: it
 * is not persisted, the theme config stays the source of truth on reload.
 */
export function SurfaceToggle({ size = "2", variant = "soft", className }: SurfaceToggleProps) {
  const { surface, setSurface } = useTheme()
  const isGlass = surface === "glass"
  const label = isGlass ? "Switch to flat surfaces" : "Switch to glass surfaces"

  return (
    <IconButton
      type="button"
      size={size}
      variant={variant}
      className={className}
      aria-label={label}
      aria-pressed={isGlass}
      title={label}
      onClick={() => setSurface?.(isGlass ? "flat" : "glass")}
    >
      {isGlass ? <Square size={18} aria-hidden="true" /> : <Layers size={18} aria-hidden="true" />}
    </IconButton>
  )
}
