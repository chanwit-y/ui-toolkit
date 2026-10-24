import { SkeletonBlock, type CustomComponentProps, type TComponentMaster } from "@gummy-ui/ui";

type SalesChartProps = {
  /** Row field shown under the first / last bar and in each bar's tooltip. Default `date`. */
  labelField?: string;
  /** Row field that sets each bar's height. Default `total`. */
  valueField?: string;
  color?: "accent" | "green" | "blue" | "orange";
  /** Chart height in px (the props arrive from JSON, so a number or numeric text). Default 200. */
  height?: number | string;
};

type Row = Record<string, unknown>;

const BAR_COLORS: Record<NonNullable<SalesChartProps["color"]>, string> = {
  accent: "var(--accent-9)",
  green: "var(--green-9)",
  blue: "var(--blue-9)",
  orange: "var(--orange-9)",
};

const money = (n: number) => `฿${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * Dashboard → "Sales, last 30 days": one bar per row of the bound array
 * (`summary.salesByDay`), highest bar = the busiest day. The value binding,
 * the field names and the colour all come from the config; `loading` is true
 * while the skeleton-mode `summary` load is still empty, so the chart draws
 * its own placeholder in its own shape. Radix vars keep it on the theme.
 */
function SalesChart({ props, value, loading }: CustomComponentProps<SalesChartProps, Row[]>) {
  const { labelField = "date", valueField = "total", color = "accent" } = props;
  const height = Number(props.height) > 0 ? Number(props.height) : 200;
  if (loading) return <SkeletonBlock height={height + 40} />;
  const rows = Array.isArray(value) ? value : [];
  if (rows.length === 0) return <p style={{ color: "var(--gray-11)", fontSize: "0.875rem" }}>No sales yet.</p>;

  const values = rows.map((r) => Number(r[valueField]) || 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const label = (r: Row | undefined) => String(r?.[labelField] ?? "");

  return (
    <figure style={{ margin: 0 }} aria-label={`Sales: ${money(total)} over ${rows.length} days`}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--gray-11)", marginBottom: "0.5rem" }}>
        <span>
          Total <strong style={{ color: "var(--gray-12)" }}>{money(total)}</strong>
        </span>
        <span>Best day {money(max)}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height,
          borderBottom: "1px solid var(--gray-6)",
        }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            title={`${label(r)}: ${money(values[i])}`}
            style={{
              flex: 1,
              minWidth: 2,
              height: `${Math.max((values[i] / max) * 100, values[i] > 0 ? 2 : 0)}%`,
              background: BAR_COLORS[color] ?? BAR_COLORS.accent,
              borderRadius: "3px 3px 0 0",
              opacity: i === rows.length - 1 ? 1 : 0.8,
            }}
          />
        ))}
      </div>
      <figcaption style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--gray-11)", marginTop: "0.25rem" }}>
        <span>{label(rows[0])}</span>
        <span>{label(rows[rows.length - 1])}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The registry <GummyApp> gets. Keys must match `customComponents[].name` in
 * gummy/projects/book-shop/project.json (declared on the studio's Env page) —
 * the engine draws a labelled placeholder for a name that is not registered.
 */
export const components: TComponentMaster = {
  SalesChart: SalesChart as TComponentMaster[string],
};
