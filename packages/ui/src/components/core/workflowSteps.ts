import get from "lodash/get";
import type { WorkflowRole, WorkflowStepKeys, WorkflowUserKeys } from "../@types";

export type WorkflowStep = Record<string, unknown>;

export const DEFAULT_STEP_KEYS: WorkflowStepKeys = {
  role: "actionType",
  sequence: "sequence",
  incharge: "inchargeUsers",
  cc: "ccUsers",
};

export function stepKeysOf(keys: Partial<WorkflowStepKeys> | undefined): WorkflowStepKeys {
  return { ...DEFAULT_STEP_KEYS, ...keys };
}

/** The line as loaded: an array (else empty), sorted by its sequence field where present. */
export function stepsFromValue(value: unknown, keys: WorkflowStepKeys): WorkflowStep[] {
  if (!Array.isArray(value)) return [];
  const list = value.filter((s): s is WorkflowStep => !!s && typeof s === "object");
  return list
    .map((step, i) => ({ step, i, seq: Number(step[keys.sequence]) }))
    .sort((a, b) => (Number.isNaN(a.seq) || Number.isNaN(b.seq) ? a.i - b.i : a.seq - b.seq || a.i - b.i))
    .map(({ step }) => step);
}

/** The same steps with `sequence` written 1-based — after every edit. */
export function renumber(steps: WorkflowStep[], keys: WorkflowStepKeys): WorkflowStep[] {
  return steps.map((step, i) => (step[keys.sequence] === i + 1 ? step : { ...step, [keys.sequence]: i + 1 }));
}

export function insertStep(steps: WorkflowStep[], at: number, step: WorkflowStep, keys: WorkflowStepKeys): WorkflowStep[] {
  const next = [...steps];
  next.splice(Math.max(0, Math.min(at, steps.length)), 0, step);
  return renumber(next, keys);
}

export function replaceStep(steps: WorkflowStep[], at: number, step: WorkflowStep, keys: WorkflowStepKeys): WorkflowStep[] {
  return renumber(steps.map((s, i) => (i === at ? { ...s, ...step } : s)), keys);
}

export function removeStep(steps: WorkflowStep[], at: number, keys: WorkflowStepKeys): WorkflowStep[] {
  return renumber(steps.filter((_, i) => i !== at), keys);
}

export const userId = (user: unknown, keys: WorkflowUserKeys): string => String(get(user, keys.id) ?? "");
export const userLabel = (user: unknown, keys: WorkflowUserKeys): string =>
  String(get(user, keys.display) ?? get(user, keys.id) ?? "");

export const usersOf = (step: WorkflowStep | undefined, field: string): WorkflowStep[] => {
  const v = step?.[field];
  return Array.isArray(v) ? (v as WorkflowStep[]) : [];
};

/**
 * Whether a role can be picked for the step at `editing` (or a new one when
 * `editing` is undefined): its `max` counts the other steps of that role.
 */
export function roleAvailable(role: WorkflowRole, steps: WorkflowStep[], keys: WorkflowStepKeys, editing?: number): boolean {
  if (role.max === undefined) return true;
  const others = steps.filter((s, i) => i !== editing && s[keys.role] === role.value).length;
  return others < role.max;
}

/**
 * Where the step at `at` (or a new step, `at` undefined) may sit, given the
 * roles pinned `first` / `last`: an insert index is allowed when no `first`
 * role's step is at or after it and no `last` role's step is before it.
 */
export function insertAllowed(index: number, steps: WorkflowStep[], roles: WorkflowRole[], keys: WorkflowStepKeys): boolean {
  const pinned = (s: WorkflowStep) => roles.find((r) => r.value === s[keys.role])?.position;
  const firstEnd = steps.reduce((at, s, i) => (pinned(s) === "first" ? i + 1 : at), 0);
  const lastStart = steps.reduce((at, s, i) => (pinned(s) === "last" && at === steps.length ? i : at), steps.length);
  return index >= firstEnd && index <= lastStart;
}

/** The index a step of `role` must take when the role is pinned, else `wanted`. */
export function placeFor(role: WorkflowRole | undefined, wanted: number, steps: WorkflowStep[], roles: WorkflowRole[], keys: WorkflowStepKeys): number {
  if (role?.position === "first") return 0;
  if (role?.position === "last") return steps.length;
  const pinned = (s: WorkflowStep) => roles.find((r) => r.value === s[keys.role])?.position;
  const firstEnd = steps.reduce((at, s, i) => (pinned(s) === "first" ? i + 1 : at), 0);
  return Math.max(firstEnd, Math.min(wanted, steps.length));
}

/** Ids of the people in charge of any step but `except` (for `allowDuplicateUsers: false`). */
export function assignedUserIds(steps: WorkflowStep[], keys: WorkflowStepKeys, userKeys: WorkflowUserKeys, except?: number): Set<string> {
  const ids = new Set<string>();
  steps.forEach((s, i) => {
    if (i === except) return;
    for (const u of usersOf(s, keys.incharge)) ids.add(userId(u, userKeys));
  });
  return ids;
}
