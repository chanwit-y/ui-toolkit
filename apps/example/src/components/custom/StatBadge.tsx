import type { CustomComponentProps } from "@gummy-ui/ui";

export type StatBadgeProps = {
  label?: string;
  /** Accent tint; `gray` when unset. */
  tone?: "accent" | "green" | "red" | "gray";
  /** Larger number. */
  big?: boolean;
};

const TONES: Record<NonNullable<StatBadgeProps["tone"]>, { bg: string; fg: string }> = {
  accent: { bg: "var(--accent-3)", fg: "var(--accent-11)" },
  green: { bg: "var(--green-3)", fg: "var(--green-11)" },
  red: { bg: "var(--red-3)", fg: "var(--red-11)" },
  gray: { bg: "var(--gray-3)", fg: "var(--gray-11)" },
};

/**
 * Static props only: a labelled pill. `value` is the number to show when
 * bound, else the `label` alone. Radix vars so it follows the theme.
 */
export function StatBadge({ props, value }: CustomComponentProps<StatBadgeProps, number | string>) {
  const { label = "", tone = "gray", big = false } = props;
  const colors = TONES[tone] ?? TONES.gray;
  return (
    <span
      className="inline-flex items-baseline gap-2 rounded-full px-3 py-1"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      {value !== undefined && value !== null && value !== "" ? (
        <span className={big ? "text-2xl font-semibold" : "text-sm font-semibold"}>{String(value)}</span>
      ) : null}
    </span>
  );
}
