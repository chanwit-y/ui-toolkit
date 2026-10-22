import { SkeletonBlock, type CustomComponentProps } from "@gummy-ui/ui";

export type SparklineProps = {
  /** Field of each item holding the array whose length is the bar height (default `countries`). */
  countField?: string;
  /** Field of each item used as the bar label (default `name`). */
  labelField?: string;
  /** Bar colour: a Radix accent var name (default `accent`). */
  color?: "accent" | "green" | "blue" | "orange";
  height?: number;
};

type Item = Record<string, unknown>;

/**
 * Bound value + loading: a bar per item of the bound array, the bar height
 * the length of `countField`. While the page load it is bound to is in
 * `skeleton` mode and empty, `loading` is true and the component draws its
 * own placeholder in its own shape.
 */
export function Sparkline({ props, value, loading }: CustomComponentProps<SparklineProps, Item[]>) {
  const { countField = "countries", labelField = "name", color = "accent", height = 72 } = props;
  if (loading) return <SkeletonBlock height={height + 24} radius={6} />;
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return <span className="text-sm" style={{ color: "var(--gray-11)" }}>No data</span>;
  const counts = items.map((it) => {
    const v = it[countField];
    return Array.isArray(v) ? v.length : Number(v) || 0;
  });
  const max = Math.max(1, ...counts);
  return (
    <div className="flex items-end gap-2" style={{ height: height + 24 }}>
      {items.map((it, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${String(it[labelField] ?? "")}: ${counts[i]}`}>
          <span className="text-xs tabular-nums" style={{ color: "var(--gray-11)" }}>{counts[i]}</span>
          <div
            className="w-full rounded-t"
            style={{ height: Math.max(2, (counts[i] / max) * height), background: `var(--${color}-9)` }}
          />
          <span className="max-w-full truncate text-xs" style={{ color: "var(--gray-12)" }}>{String(it[labelField] ?? "")}</span>
        </div>
      ))}
    </div>
  );
}
