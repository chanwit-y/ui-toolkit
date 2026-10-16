import type { CustomComponentProps } from "@gummy-ui/ui";

export type CountryChipProps = {
  /** Page key to open on click (default `countryDetail`); its `:id` is the row's `_id`. */
  page?: string;
  showCode?: boolean;
};

type Country = { _id: string; name: string; code: string; avatar?: string | { src: string } };

/**
 * Inside a repeater: `row` is the enclosing item and `navigate` resolves
 * through the enclosing PageRouter, so the chip opens the detail page.
 */
export function CountryChip({ props, row, navigate }: CustomComponentProps<CountryChipProps>) {
  const { page = "countryDetail", showCode = true } = props;
  const country = row as Country | undefined;
  if (!country) return <span className="text-sm" style={{ color: "var(--gray-11)" }}>Not inside a repeater</span>;
  const src = typeof country.avatar === "string" ? country.avatar : country.avatar?.src;
  return (
    <button
      type="button"
      onClick={() => navigate({ page, params: { id: { type: "value", key: "id", value: country._id } } })}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
      style={{ borderColor: "var(--gray-6)", background: "var(--color-panel-solid)", color: "var(--gray-12)" }}
    >
      {src ? <img src={src} alt="" width={20} height={14} className="rounded-sm" /> : null}
      <span>{country.name}</span>
      {showCode ? <span className="font-mono text-xs" style={{ color: "var(--gray-11)" }}>{country.code}</span> : null}
    </button>
  );
}
