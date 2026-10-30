import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formulaCallAt, formulaSpans, suggestFormula, type FormulaCatalog, type FormulaSuggestion } from "./core/formulaAssist";

export type FormulaBarHandle = {
  /** Put `text` at the caret (or where the caret last was), spaced from what precedes it. */
  insert: (text: string) => void;
};

export type FormulaBarProps = {
  value: string;
  onChange: (text: string) => void;
  catalog: FormulaCatalog;
  /** The parse problem to show (red border, the bad token underlined, the message below). */
  error?: string | null;
  /** Where the problem is (a character index). */
  errorAt?: number;
  placeholder?: string;
  "aria-label": string;
};

const OPERATORS = ["+", "−", "×", "÷", "&", "(", ")"];

/**
 * The formula bar: a textarea over a coloured overlay with the same metrics —
 * fields, page data and saved items tinted, functions bold, literals green —
 * with plain-word autocomplete, the function hint while the caret is inside a
 * call, and the bad token underlined.
 */
export const FormulaBar = forwardRef<FormulaBarHandle, FormulaBarProps>(function FormulaBar({ value, onChange, catalog, error, errorAt, placeholder, "aria-label": ariaLabel }, handle) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [closed, setClosed] = useState(false);
  const items: FormulaSuggestion[] = useMemo(() => (caret === null || closed ? [] : suggestFormula(value.slice(0, caret), catalog).slice(0, 8)), [caret, closed, value, catalog]);
  const spans = useMemo(() => formulaSpans(value, error ? errorAt : undefined), [value, error, errorAt]);
  const call = caret === null ? null : formulaCallAt(value, caret);

  // Esc closes the open list, not the dialog: Radix listens on the document in
  // the capture phase, so only `window` is early enough to keep the draft.
  const listOpen = items.length > 0;
  useEffect(() => {
    if (!listOpen) return;
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setClosed(true);
    };
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
  }, [listOpen]);

  // Grow with the text, and re-fit when the bar's width changes under it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  // Where an outside insert lands while the bar isn't focused.
  const lastCaret = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);
  const insertAt = (text: string, replace = 0) => {
    setFlash((n) => n + 1);
    const el = ref.current;
    const focused = el !== null && document.activeElement === el;
    const at = focused ? el.selectionStart : (lastCaret.current ?? value.length);
    const end = focused ? el.selectionEnd : at;
    const before = value.slice(0, at - replace);
    const needsSpace = replace === 0 && before && !/[\s([]$/.test(before) && !/^[)\],]/.test(text);
    const pos = before.length + (needsSpace ? 1 : 0) + text.length;
    onChange(`${before}${needsSpace ? " " : ""}${text}${value.slice(end)}`);
    lastCaret.current = pos;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };
  useImperativeHandle(handle, () => ({ insert: (text) => insertAt(text) }));

  const onKeyDown = (e: KeyboardEvent) => {
    if (items.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const s = items[Math.min(active, items.length - 1)];
        insertAt(s.insert, s.replace);
        return;
      }
    }
    if (e.key === "Enter") e.preventDefault();
  };

  // The overlay: every span coloured, the text between them as is.
  const overlay: ReactNode[] = [];
  let at = 0;
  spans.forEach((s, i) => {
    if (s.from > at) overlay.push(value.slice(at, s.from));
    overlay.push(
      <span key={i} className={`gummy-fx-hl gummy-fx-hl-${s.tone}`}>
        {value.slice(s.from, s.to)}
      </span>,
    );
    at = s.to;
  });
  if (at < value.length) overlay.push(value.slice(at));

  return (
    <div className="gummy-fx-barwrap">
      <div className="gummy-fx-bar" data-invalid={error ? "" : undefined}>
        {flash > 0 && <span key={flash} aria-hidden className="gummy-fx-bar-ring" />}
        <div className="gummy-fx-bar-overlay" aria-hidden>
          {overlay}
          {/* Keeps a trailing new line's height. */}
          {"​"}
        </div>
        <textarea
          ref={ref}
          value={value}
          rows={1}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart);
            setClosed(false);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onSelect={(e) => {
            setCaret(e.currentTarget.selectionStart);
            lastCaret.current = e.currentTarget.selectionStart;
          }}
          onFocus={(e) => setCaret(e.currentTarget.selectionStart)}
          onBlur={() => window.setTimeout(() => setCaret(null), 150)}
        />
        {items.length > 0 && (
          <ul role="listbox" aria-label="Suggestions" className="gummy-fx-suggest">
            {items.map((s, i) => (
              <li key={`${s.label}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  data-active={i === active ? "" : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertAt(s.insert, s.replace);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className={`gummy-fx-suggest-label gummy-fx-tone-${s.kind}`}>{s.label}</span>
                  {s.sub && <span className="gummy-fx-suggest-sub">{s.sub}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {call && !items.length && (
        <p className="gummy-fx-hint">
          <code>
            {call.fn}(
            {call.args.map((a, i) => (
              <span key={a}>
                {i ? ", " : ""}
                <span data-current={i === call.arg ? "" : undefined}>{a}</span>
              </span>
            ))}
            )
          </code>{" "}
          — {call.hint}
        </p>
      )}
      <div className="gummy-fx-ops" role="group" aria-label="Operators">
        {OPERATORS.map((op) => (
          <button key={op} type="button" aria-label={`Insert ${op}`} title={op === "&" ? "Join as text" : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => insertAt(op)}>
            {op}
          </button>
        ))}
      </div>
      {error && !items.length && (
        <p className="gummy-fx-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
