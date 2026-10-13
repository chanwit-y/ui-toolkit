import get from "lodash/get";
import type {
  ApprovalKeyPath,
  ApprovalLineElement,
  ApprovalLineKeys,
  ApprovalRoleRule,
  ApprovalStep,
  ApprovalStepState,
} from "../@types";
import { renderTemplate } from "../../util/template";

/** The document statuses of the user's approval system, as step states. */
export const DEFAULT_STATUS_MAP: Record<string, ApprovalStepState> = {
  "0": "pending",
  "1": "current",
  "2": "current",
  "3": "rejected",
  "4": "revised",
  "5": "done",
  "6": "done",
  "7": "skipped",
  "8": "skipped",
  "9": "done",
};

export const DEFAULT_STATUS_LABELS: Record<string, string> = {
  "0": "Draft",
  "1": "Reviewing",
  "2": "Approving",
  "3": "Rejected",
  "4": "Revised",
  "5": "Approved",
  "6": "Completed",
  "7": "Canceled",
  "8": "Expired",
  "9": "Renewed",
};

/** The first path that resolves to something on the row. */
export function readKey(row: unknown, key: ApprovalKeyPath | undefined): unknown {
  if (key === undefined) return undefined;
  for (const path of Array.isArray(key) ? key : [key]) {
    const v = get(row, path);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const text = (v: unknown): string | undefined =>
  v === undefined || v === null || v === "" ? undefined : typeof v === "object" ? undefined : String(v);

/** The label of the first rule whose `path` exists on the row (and `sequence` matches). */
export function roleOf(row: unknown, rules: ApprovalRoleRule[] | undefined, sequence: unknown): string | undefined {
  for (const rule of rules ?? []) {
    const present = get(row, rule.path) !== undefined;
    if (!present) continue;
    if (rule.sequence !== undefined && String(rule.sequence) !== String(sequence)) continue;
    return rule.role;
  }
  return undefined;
}

type NormalizeConfig = Pick<ApprovalLineElement, "keys" | "roleRules" | "statusMap" | "statusLabels" | "avatarUrl">;

/** One raw row → a step (no requester, no current inference — see `normalizeApprovalSteps`). */
export function normalizeApprovalStep(row: unknown, config: NormalizeConfig): ApprovalStep {
  const keys: ApprovalLineKeys = config.keys;
  const statusMap = config.statusMap ?? DEFAULT_STATUS_MAP;
  const statusLabels = config.statusLabels ?? DEFAULT_STATUS_LABELS;
  const sequence = readKey(row, keys.sequence);
  const status = text(readKey(row, keys.status));
  const step: ApprovalStep = {
    name: text(readKey(row, keys.name)) ?? "",
    role: text(readKey(row, keys.role)) ?? roleOf(row, config.roleRules, sequence),
    jobTitle: text(readKey(row, keys.jobTitle)),
    avatar: text(readKey(row, keys.avatar)),
    state: (status !== undefined && statusMap[status]) || "pending",
    status,
    statusLabel: status !== undefined ? statusLabels[status] : undefined,
    remark: text(readKey(row, keys.remark)),
    date: text(readKey(row, keys.date)),
    personId: text(readKey(row, keys.personId)),
  };
  if (!step.avatar && config.avatarUrl) {
    const url = renderTemplate(config.avatarUrl, step);
    // A template whose placeholders all resolved empty is no URL.
    if (url !== config.avatarUrl.replace(/\{\{[^}]*\}\}/g, "")) step.avatar = url;
  }
  return step;
}

/**
 * The whole line: rows sorted by `sequence` when they carry one (rows without
 * keep their order, ahead), each normalized, the `requester` prepended, and —
 * when no step is `current` — the first `pending` after the last `done`
 * promoted to `current`, so the step the request waits on always reads so.
 */
export function normalizeApprovalSteps(
  rows: unknown,
  config: NormalizeConfig,
  requester?: ApprovalStep,
): ApprovalStep[] {
  const list = Array.isArray(rows) ? rows : [];
  const indexed = list.map((row, i) => {
    const seq = readKey(row, config.keys.sequence);
    return { row, i, seq: seq === undefined ? undefined : Number(seq) };
  });
  indexed.sort((a, b) => {
    if (a.seq === undefined && b.seq === undefined) return a.i - b.i;
    if (a.seq === undefined) return -1;
    if (b.seq === undefined) return 1;
    return a.seq - b.seq || a.i - b.i;
  });
  const steps = indexed.map(({ row }) => normalizeApprovalStep(row, config));
  const all = requester ? [requester, ...steps] : steps;
  // A rejected line has stopped: nothing is waiting on anyone.
  if (!all.some((s) => s.state === "current" || s.state === "rejected")) {
    const lastDone = all.reduce((at, s, i) => (s.state === "done" || s.state === "revised" ? i : at), -1);
    const next = all.findIndex((s, i) => i > lastDone && s.state === "pending");
    if (next >= 0) all[next] = { ...all[next], state: "current" };
  }
  return all;
}

/** Two-letter initials of a name ("Chutima Pimthong" → "CP"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
