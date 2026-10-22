import { SkeletonBlock, type CustomComponentProps, type TComponentMaster } from "@gummy-ui/ui";

type StatBadgeProps = {
  label?: string;
  /** Accent tint; `gray` when unset. */
  tone?: "accent" | "green" | "gray";
};

const TONES: Record<NonNullable<StatBadgeProps["tone"]>, { bg: string; fg: string }> = {
  accent: { bg: "var(--accent-3)", fg: "var(--accent-11)" },
  green: { bg: "var(--green-3)", fg: "var(--green-11)" },
  gray: { bg: "var(--gray-3)", fg: "var(--gray-11)" },
};

/**
 * A custom component a config places by name (`type: "custom"`, `component:
 * "StatBadge"`): `props` arrive verbatim, `value` is the one bound value and
 * `loading` is true while a skeleton-mode page load it reads is still empty.
 * Radix vars keep it on the theme in light and dark.
 */
function StatBadge({ props, value, loading }: CustomComponentProps<StatBadgeProps, string | number>) {
  const { label = "", tone = "gray" } = props;
  const colors = TONES[tone] ?? TONES.gray;
  if (loading) return <SkeletonBlock height={28} width={160} />;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.5rem",
        borderRadius: 9999,
        padding: "0.25rem 0.75rem",
        background: colors.bg,
        color: colors.fg,
      }}
    >
      <span style={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {value !== undefined && value !== null && value !== "" ? (
        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{String(value)}</span>
      ) : null}
    </span>
  );
}

/**
 * The registry <GummyApp> gets. Keys must match `customComponents[].name` in
 * gummy/projects/demo.json — the engine draws a labelled placeholder for a
 * name that is not registered.
 */
export const components: TComponentMaster = {
  StatBadge: StatBadge as TComponentMaster[string],
};
