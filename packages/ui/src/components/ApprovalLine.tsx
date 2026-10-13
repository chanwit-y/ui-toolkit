import * as Tooltip from "@radix-ui/react-tooltip";
import { Check, Clock, Minus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import get from "lodash/get";
import type { ApprovalLineElement, ApprovalStep, ApprovalStepState, FormListReadApi } from "./@types";
import { renderTemplate } from "../util/template";
import { Avatar } from "./Avatar";
import { initialsOf, normalizeApprovalSteps, readKey } from "./core/approvalSteps";
import { displayText, useDataValue } from "./core/rowScope";
import { useReadApi } from "./core/useReadApi";

const AVATAR_PX = { sm: 32, md: 40, lg: 48 } as const;

const BADGE: Record<ApprovalStepState, { icon: ReactNode; label: string } | null> = {
  done: { icon: <Check strokeWidth={3} />, label: "Approved" },
  rejected: { icon: <X strokeWidth={3} />, label: "Rejected" },
  revised: { icon: <RotateCcw strokeWidth={3} />, label: "Revised" },
  skipped: { icon: <Minus strokeWidth={3} />, label: "Skipped" },
  current: { icon: <Clock strokeWidth={3} />, label: "Waiting" },
  pending: null,
};

export type ApprovalLineViewProps = Pick<
  ApprovalLineElement,
  "orientation" | "size" | "showJobTitle" | "showIndex" | "stepMinWidth" | "verticalBelow" | "emptyText" | "className"
> & {
  steps: ApprovalStep[];
  style?: CSSProperties;
};

/**
 * The tooltip of one step: name, job title, role, status label, date, remark
 * — also the `title`, so keyboard and touch users get the same text.
 */
function stepDetails(step: ApprovalStep): string[] {
  const lines = [step.name];
  if (step.jobTitle) lines.push(step.jobTitle);
  if (step.role) lines.push(step.role);
  const state = step.statusLabel ?? BADGE[step.state]?.label ?? step.state;
  lines.push(step.date ? `${state} · ${formatDate(step.date)}` : state);
  if (step.remark) lines.push(`“${step.remark}”`);
  return lines;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * The approval line itself, hook-light and fed with normalized steps (see the
 * grilled design): an `<ol>` of avatars joined by connectors — solid up to the
 * current step, dashed after — each with a state badge, the name, the role
 * and optionally the job title. Horizontal lines never wrap: every step gets
 * an equal share down to `stepMinWidth`, then the line scrolls and the
 * current step is scrolled into view. `verticalBelow` flips to the vertical
 * timeline under a breakpoint (CSS only). Radix vars throughout, so it
 * follows the theme and dark mode. Rendered by the engine builder and by the
 * studio canvas alike.
 */
export function ApprovalLineView({
  steps,
  orientation = "horizontal",
  size = "md",
  showJobTitle = false,
  showIndex = true,
  stepMinWidth = 96,
  verticalBelow,
  emptyText = "No approval steps.",
  className,
  style,
}: ApprovalLineViewProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);
  // A horizontal line that overflows starts scrolled so the current step is in
  // view — the list's own scrollLeft only, never the page (`scrollIntoView`
  // would scroll every ancestor, i.e. the page down to the line on mount).
  useEffect(() => {
    const list = listRef.current;
    const current = currentRef.current;
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
  }, [steps, orientation]);

  if (steps.length === 0) {
    return <p className={`approval-line-empty ${className ?? ""}`} style={style}>{emptyText}</p>;
  }
  // The avatar size and the step's minimum width are the two config numbers.
  const vars = { "--al-avatar": `${AVATAR_PX[size]}px`, "--al-step-min": `${stepMinWidth}px`, ...style } as CSSProperties;
  const currentIndex = steps.findIndex((s) => s.state === "current");
  // A connector is "reached" (solid) while it leads up to the current step; with
  // no current step (all done, or rejected) every connector up to the last
  // settled step is solid.
  const reached = (i: number) =>
    currentIndex >= 0 ? i < currentIndex : steps[i + 1]?.state !== "pending";

  return (
    <Tooltip.Provider delayDuration={200}>
      <ol
        ref={listRef}
        className={`approval-line approval-line-${orientation} approval-line-${size} ${verticalBelow ? `approval-line-vertical-below-${verticalBelow}` : ""} ${className ?? ""}`}
        style={vars}
        aria-label="Approval line"
      >
        {steps.map((step, i) => {
          const badge = BADGE[step.state];
          const details = stepDetails(step);
          return (
            <li
              key={`${i}-${step.name}`}
              ref={step.state === "current" ? currentRef : undefined}
              className={`approval-step approval-step-${step.state}`}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {i > 0 && <span className={`approval-connector ${reached(i - 1) ? "approval-connector-reached" : ""}`} aria-hidden />}
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="approval-step-avatar" tabIndex={0} title={details.join("\n")}>
                    <Avatar src={step.avatar} alt={step.name} fallback={initialsOf(step.name)} size={AVATAR_PX[size]} />
                    {badge && (
                      <span className="approval-step-badge" role="img" aria-label={step.statusLabel ?? badge.label}>
                        {badge.icon}
                      </span>
                    )}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="bottom" sideOffset={6} collisionPadding={8} className="approval-step-tooltip">
                    {details.map((line, j) => (
                      <span key={j} className={j === 0 ? "approval-step-tooltip-name" : undefined}>{line}</span>
                    ))}
                    <Tooltip.Arrow className="approval-step-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <div className="approval-step-text">
                <span className="approval-step-name">{showIndex ? `${i + 1}. ${step.name}` : step.name}</span>
                {step.role && <span className="approval-step-role">({step.role})</span>}
                {showJobTitle && step.jobTitle && <span className="approval-step-title">{step.jobTitle}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </Tooltip.Provider>
  );
}

export type ApprovalLineProps = Omit<ApprovalLineElement, "name" | "api"> & {
  name?: string;
  /** `api` resolved against the ApiMaster (the builder does it). */
  api?: FormListReadApi;
};

/**
 * The bound approval line (the `approvalline` element): resolves `items` and
 * the `requester` bindings against the URL, global state and the enclosing
 * repeater item (`useDataValue`, so it needs a router like every bound
 * element), normalizes the raw rows through `keys` / `roleRules` /
 * `statusMap` and renders {@link ApprovalLineView}.
 */
export function ApprovalLine({ name = "approvalLine", items, api, stepsPath, keys, requester, roleRules, statusMap, statusLabels, avatarUrl, emptyText, ...view }: ApprovalLineProps) {
  const scoped = useDataValue(api ? undefined : items);
  const read = useReadApi(name, api);
  // With `api` the record is fetched here and the rows sit at `stepsPath`
  // inside it; the requester's `*Path`s read the same record.
  const record = api ? read.data : undefined;
  const rows = api ? (stepsPath ? get(record, stepsPath) : record) : scoped;
  const reqName = displayText(useDataValue(requester?.nameValue)) ?? text(readKey(record, requester?.namePath)) ?? requester?.name;
  const reqTitle = displayText(useDataValue(requester?.jobTitleValue)) ?? text(readKey(record, requester?.jobTitlePath)) ?? requester?.jobTitle;
  const reqAvatar = displayText(useDataValue(requester?.avatarValue)) ?? text(readKey(record, requester?.avatarPath)) ?? requester?.avatar;
  const reqPersonId = text(readKey(record, requester?.personIdPath));
  const steps = useMemo(() => {
    const first: ApprovalStep | undefined =
      requester && reqName
        ? { name: reqName, jobTitle: reqTitle, avatar: reqAvatar, personId: reqPersonId, role: requester.role ?? "Requester", state: requester.state ?? "done" }
        : undefined;
    if (first && !first.avatar && avatarUrl) {
      const url = renderTemplate(avatarUrl, first);
      if (url !== avatarUrl.replace(/\{\{[^}]*\}\}/g, "")) first.avatar = url;
    }
    return normalizeApprovalSteps(rows, { keys, roleRules, statusMap, statusLabels, avatarUrl }, first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, reqName, reqTitle, reqAvatar, reqPersonId, JSON.stringify([keys, requester, roleRules, statusMap, statusLabels, avatarUrl])]);
  // While the own read is held or loading, say so instead of "no steps".
  const empty = api && (read.held || read.isLoading) ? "Loading…" : api && read.isError ? "Couldn't load the approval." : emptyText;
  return <ApprovalLineView steps={steps} emptyText={empty} {...view} />;
}

const text = (v: unknown): string | undefined =>
  v === undefined || v === null || v === "" || typeof v === "object" ? undefined : String(v);
