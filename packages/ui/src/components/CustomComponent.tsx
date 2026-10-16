import { Component, createElement, useCallback, useMemo, type CSSProperties, type ErrorInfo, type ReactNode } from "react";
import type { CustomComponentElement, CustomComponentProps } from "./@types";
import { resolveCustomComponent, useComponents } from "./core/components";
import { useNavigateTo } from "./core/pages";
import { useDataValue, useRowScope, useSkeleton } from "./core/rowScope";
import { readSlice } from "./core/stateStore";

const EMPTY_PROPS: Record<string, unknown> = {};

/** Read-only page-data access handed to every custom component (one shared object). */
const STATE_READER: CustomComponentProps["state"] = { get: (key, path) => readSlice(key, path) };

/** A value as short JSON for the placeholder; functions and failures read as their type. */
export function previewJson(value: unknown, max = 240): string {
  if (value === undefined) return "undefined";
  let text: string;
  try {
    text = JSON.stringify(value, (_k, v) => (typeof v === "function" ? "[function]" : v)) ?? String(value);
  } catch {
    text = `[${typeof value}]`;
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type CustomComponentPlaceholderProps = {
  /** The registry name, drawn as the box's title. */
  name: string;
  /** One line under the title — "not registered", the error, a binding token. */
  note?: ReactNode;
  /** `key: value` lines (the props, a resolved value). */
  details?: Record<string, unknown>;
  /** Paints the box in the error tint (a thrown render). */
  error?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The visible stand-in for a custom component: a dashed box with the name,
 * a note and `key: value` lines. Drawn by the engine when the name isn't
 * registered or the component threw, by the studio canvas for every custom
 * cell, and by the Live Preview's stubs (with the resolved value), so one
 * component serves three states. Radix vars only, so it follows the theme.
 */
export function CustomComponentPlaceholder({ name, note, details, error = false, className, style }: CustomComponentPlaceholderProps) {
  const entries = details ? Object.entries(details) : [];
  return (
    <div
      className={`gummy-custom-placeholder flex min-h-10 w-full flex-col gap-1 rounded-md border border-dashed px-3 py-2 text-xs ${className ?? ""}`}
      style={{
        borderColor: error ? "var(--red-7)" : "var(--gray-7)",
        background: error ? "var(--red-2)" : "var(--gray-2)",
        color: error ? "var(--red-11)" : "var(--gray-11)",
        ...style,
      }}
      role={error ? "alert" : undefined}
      data-custom-component={name}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-semibold" style={{ color: error ? "var(--red-12)" : "var(--gray-12)" }}>
          {name || "(unnamed)"}
        </span>
        {note ? <span className="truncate">{note}</span> : null}
      </div>
      {entries.length ? (
        <dl className="m-0 grid gap-x-2" style={{ gridTemplateColumns: "max-content 1fr" }}>
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono" style={{ color: "var(--gray-12)" }}>{k}</dt>
              <dd className="m-0 truncate font-mono">{previewJson(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

type BoundaryProps = { name: string; children: ReactNode; className?: string; style?: CSSProperties };
type BoundaryState = { error: Error | null };

/**
 * One error boundary per custom component: a throwing render costs its own
 * cell (the placeholder in the error tint), not the page. Resets when the
 * component name changes.
 */
export class CustomComponentBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[gummy-ui] Custom component "${this.props.name}" threw while rendering.`, error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (prev.name !== this.props.name && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <CustomComponentPlaceholder
          name={this.props.name}
          note={`threw: ${error.message || String(error)}`}
          error
          className={this.props.className}
          style={this.props.style}
        />
      );
    }
    return this.props.children;
  }
}

export type CustomComponentHostProps = Pick<CustomComponentElement, "component" | "props" | "value" | "className" | "style">;

/**
 * The `custom` element at runtime: resolves the registry entry, the bound
 * `value` (`useDataValue` — URL, page data, the enclosing repeater item), the
 * skeleton flag and the navigate / state helpers, and renders the consumer's
 * component inside its boundary. Needs a router above it like every bound
 * element.
 */
export function CustomComponent({ component: name, props, value, className, style }: CustomComponentHostProps) {
  const registry = useComponents();
  const Comp = useMemo(() => resolveCustomComponent(registry, name), [registry, name]);
  const data = useDataValue(value);
  const loading = useSkeleton(value);
  const scope = useRowScope();
  const navigateTo = useNavigateTo();
  const navigate = useCallback<CustomComponentProps["navigate"]>((target) => navigateTo(target), [navigateTo]);

  if (!Comp) {
    return (
      <CustomComponentPlaceholder
        name={name}
        note={registry ? "not registered" : "no <ComponentsProvider>"}
        details={props}
        className={className}
        style={style}
      />
    );
  }

  const componentProps: CustomComponentProps = {
    props: props ?? EMPTY_PROPS,
    value: data,
    loading,
    row: scope?.row,
    navigate,
    state: STATE_READER,
  };

  return (
    <CustomComponentBoundary name={name} className={className} style={style}>
      <div className={`gummy-custom-component ${className ?? ""}`} style={style}>
        {createElement(Comp, componentProps)}
      </div>
    </CustomComponentBoundary>
  );
}
