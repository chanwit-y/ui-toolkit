import { IconButton } from "@radix-ui/themes"
import { Icon } from "./Icon"
import { useTheme } from "./context/ThemeProvider"

export type ThemeToggleProps = {
  /** Radix IconButton size. */
  size?: "1" | "2" | "3" | "4"
  /** Radix IconButton variant. */
  variant?: "classic" | "solid" | "soft" | "surface" | "outline" | "ghost"
  className?: string
}

/**
 * Light/dark appearance toggle. Reads and flips the ThemeProvider's appearance
 * state and is accent-colored from the active theme. Renders a sun when dark
 * (click to go light) and a moon when light (click to go dark).
 */
export function ThemeToggle({ size = "2", variant = "soft", className }: ThemeToggleProps) {
  const { appearance, toggleAppearance } = useTheme()
  const isDark = appearance === "dark"

  return (
    <IconButton
      type="button"
      size={size}
      variant={variant}
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => toggleAppearance?.()}
    >
      <Icon icon={isDark ? "sun" : "moon"} size={18} />
    </IconButton>
  )
}
