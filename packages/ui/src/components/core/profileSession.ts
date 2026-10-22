import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { ApprovalKeyPath, DataValue, ProfileKeys } from "../@types";
import { renderTemplate } from "../../util/template";
import { readKey } from "./approvalSteps";
import { useDataValue } from "./rowScope";
import { getStateStore, type StateStore } from "./stateStore";

/**
 * The active-profile session shared by the `replaceprofile` and
 * `switchprofile` elements (see the grilled design): the active profile is a
 * global-state slice (`stateKey`, default `profile`) any component can bind
 * with `{ type: "state", key: "profile" }`; while impersonating, the admin's
 * own profile sits in `<stateKey>Original`. A switch is remembered in
 * localStorage (the chosen `userId`), an impersonation in sessionStorage
 * (`{ original, replacedPersonId }`, re-fetched on load) — every storage
 * access is wrapped, so the app works without storage. Pure helpers are
 * tested in `profileSession.test.ts`.
 */

export const DEFAULT_PROFILE_STATE_KEY = "profile";

/** Paths that fit the Banpu user-profile shape out of the box. */
export const DEFAULT_PROFILE_KEYS: Required<Omit<ProfileKeys, "nameTemplate">> & Pick<ProfileKeys, "nameTemplate"> = {
  personId: ["personId", "PersonId"],
  userId: ["userId", "UserId"],
  name: ["FullNameEN", "fullName", "displayName", "name"],
  nameTemplate: "{{firstNameEn}} {{lastNameEN}}",
  jobTitle: ["jobTitle", "JobTitle", "position"],
  company: ["companyModel.name", "company"],
  department: ["businessUnitModel.name", "department"],
  email: ["email", "Email"],
  avatar: ["avatar", "image", "photo"],
};

export type NormalizedProfile = {
  personId: string;
  /** Unique per profile (one person holds several); falls back to `personId`. */
  userId: string;
  name: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  email?: string;
  avatar?: string;
  raw: unknown;
};

export function originalStateKey(stateKey: string): string {
  return `${stateKey}Original`;
}

const text = (v: unknown): string | undefined =>
  v === undefined || v === null || v === "" || typeof v === "object" ? undefined : String(v);

/** The display name: the template when it renders to something, else the `name` paths. */
function readName(raw: unknown, keys: ProfileKeys): string | undefined {
  if (keys.nameTemplate) {
    const rendered = renderTemplate(keys.nameTemplate, raw).replace(/\s+/g, " ").trim();
    // A template whose every placeholder is missing renders to its literal parts only.
    const blank = keys.nameTemplate.replace(/\{\{[^}]*\}\}/g, "").replace(/\s+/g, " ").trim();
    if (rendered && rendered !== blank) return rendered;
  }
  return text(readKey(raw, keys.name));
}

/** One raw profile record read through `keys` (defaults merged in). */
export function normalizeProfile(raw: unknown, keys: ProfileKeys = {}): NormalizedProfile {
  const k: ProfileKeys = { ...DEFAULT_PROFILE_KEYS, ...keys };
  const read = (path: ApprovalKeyPath | undefined) => text(readKey(raw, path));
  const personId = read(k.personId) ?? "";
  const userId = read(k.userId) ?? personId;
  const email = read(k.email);
  return {
    personId,
    userId,
    name: readName(raw, k) ?? email ?? userId,
    jobTitle: read(k.jobTitle),
    company: read(k.company),
    department: read(k.department),
    email,
    avatar: read(k.avatar),
    raw,
  };
}

/** "Position · Company · Department" — what tells one profile of a person from another. */
export function profileSubtitle(p: Pick<NormalizedProfile, "jobTitle" | "company" | "department">): string {
  return [p.jobTitle, p.company, p.department].filter(Boolean).join(" · ");
}

/**
 * Which of a person's profiles to make active on load: the saved one when it
 * is still in the list, else the first profile.
 */
export function pickRestoredProfile<T extends { userId: string }>(profiles: T[], savedUserId: string | null | undefined): T | undefined {
  if (profiles.length === 0) return undefined;
  return (savedUserId && profiles.find((p) => p.userId === savedUserId)) || profiles[0];
}

// ---- storage (every call wrapped: storage may be missing, full or blocked) ----

export type ImpersonationRecord = { original: unknown; replacedPersonId: string };

const switchedKey = (stateKey: string) => `gummy.profile.${stateKey}.userId`;
const impersonationKey = (stateKey: string) => `gummy.profile.${stateKey}.impersonation`;

function readItem(getStorage: () => Storage, key: string): string | null {
  try {
    return getStorage().getItem(key);
  } catch {
    return null;
  }
}

function writeItem(getStorage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) getStorage().removeItem(key);
    else getStorage().setItem(key, value);
  } catch {
    // storage unavailable — the choice simply isn't remembered
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

export function readSwitchedUserId(stateKey: string): string | null {
  return readItem(local, switchedKey(stateKey));
}

export function writeSwitchedUserId(stateKey: string, userId: string): void {
  writeItem(local, switchedKey(stateKey), userId);
}

export function parseImpersonationRecord(raw: string | null): ImpersonationRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Partial<ImpersonationRecord>;
    if (typeof record.replacedPersonId !== "string" || !record.replacedPersonId) return null;
    if (typeof record.original !== "object" || record.original === null) return null;
    return { original: record.original, replacedPersonId: record.replacedPersonId };
  } catch {
    return null;
  }
}

export function readImpersonation(stateKey: string): ImpersonationRecord | null {
  return parseImpersonationRecord(readItem(session, impersonationKey(stateKey)));
}

export function writeImpersonation(stateKey: string, record: ImpersonationRecord): void {
  let json: string | null = null;
  try {
    json = JSON.stringify(record);
  } catch {
    return;
  }
  writeItem(session, impersonationKey(stateKey), json);
}

export function clearImpersonation(stateKey: string): void {
  writeItem(session, impersonationKey(stateKey), null);
}

// ---- the per-stateKey session (coordination between the two elements) ----

type ProfileSessionState = {
  /** A replacement (or its restore) is loading: the switch list must not reconcile meanwhile. */
  pending: boolean;
  /** The person whose profile list was already reconciled with the saved switch. */
  reconciledPersonId: string | null;
  /** Whether some element already took the persisted impersonation to re-fetch. */
  restoreClaimed: boolean;
  setPending: (pending: boolean) => void;
  setReconciled: (personId: string | null) => void;
  claimRestore: () => boolean;
};

type ProfileSessionStore = UseBoundStore<StoreApi<ProfileSessionState>>;

const sessions = new Map<string, ProfileSessionStore>();

export function getProfileSessionStore(stateKey: string): ProfileSessionStore {
  let store = sessions.get(stateKey);
  if (!store) {
    store = create<ProfileSessionState>((set, get) => ({
      pending: false,
      reconciledPersonId: null,
      restoreClaimed: false,
      setPending: (pending) => set({ pending }),
      setReconciled: (reconciledPersonId) => set({ reconciledPersonId }),
      claimRestore: () => {
        if (get().restoreClaimed) return false;
        set({ restoreClaimed: true });
        return true;
      },
    }));
    sessions.set(stateKey, store);
  }
  return store;
}

function useSliceData(store: StateStore): unknown {
  const get = useCallback(() => store.getState().data, [store]);
  return useSyncExternalStore(store.subscribe, get, get);
}

export type ProfileSessionOptions = {
  stateKey?: string;
  keys?: ProfileKeys;
  initial?: DataValue;
  persist?: boolean;
};

export type ProfileSession = {
  stateKey: string;
  keys: ProfileKeys;
  persist: boolean;
  active: unknown;
  activeProfile: NormalizedProfile | undefined;
  original: unknown;
  originalProfile: NormalizedProfile | undefined;
  isImpersonating: boolean;
  pending: boolean;
  setPending: (pending: boolean) => void;
  reconciledPersonId: string | null;
  setReconciled: (personId: string | null) => void;
  claimRestore: () => boolean;
  /** Make `profile` the active one (no persistence). */
  apply: (profile: unknown) => void;
  /** Switch Profile: apply and remember the `userId`. */
  switchTo: (profile: unknown) => void;
  /** Replace Profile: keep the current profile as the original (the first one across chained replacements), apply, remember. */
  startImpersonation: (profile: unknown, replacedPersonId: string) => void;
  /** A restore in flight: the stored original, before the replaced person's profiles arrive. */
  setOriginal: (profile: unknown) => void;
  /** Drop the impersonation without changing the active profile (a failed restore). */
  cancelImpersonation: () => void;
  returnToOriginal: () => void;
};

/**
 * The shared session of one `stateKey`: the two slices, the coordination
 * store, and the actions. Seeds the active slice from `initial` while empty.
 */
export function useProfileSession({ stateKey = DEFAULT_PROFILE_STATE_KEY, keys, initial, persist = true }: ProfileSessionOptions): ProfileSession {
  const keysSig = JSON.stringify(keys ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedKeys = useMemo<ProfileKeys>(() => ({ ...DEFAULT_PROFILE_KEYS, ...keys }), [keysSig]);
  const activeStore = useMemo(() => getStateStore(stateKey), [stateKey]);
  const originalStore = useMemo(() => getStateStore(originalStateKey(stateKey)), [stateKey]);
  const sessionStore = useMemo(() => getProfileSessionStore(stateKey), [stateKey]);
  const active = useSliceData(activeStore);
  const original = useSliceData(originalStore);
  const pending = sessionStore((s) => s.pending);
  const reconciledPersonId = sessionStore((s) => s.reconciledPersonId);
  const initialValue = useDataValue(initial);

  // Seed the slice while it is still empty. The store is read directly, not
  // the rendered `active`: a restore may have written the replaced profile in
  // the same commit, and the stale closure would overwrite it with `initial`.
  useEffect(() => {
    if (initialValue === undefined || initialValue === null) return;
    if (activeStore.getState().data !== undefined) return;
    activeStore.getState().setLoad({ data: initialValue, status: "success" });
  }, [active, initialValue, activeStore]);

  const apply = useCallback((profile: unknown) => activeStore.getState().setLoad({ data: profile, status: "success" }), [activeStore]);

  const switchTo = useCallback(
    (profile: unknown) => {
      apply(profile);
      if (persist) writeSwitchedUserId(stateKey, normalizeProfile(profile, resolvedKeys).userId);
    },
    [apply, persist, stateKey, resolvedKeys],
  );

  const setOriginal = useCallback((profile: unknown) => originalStore.getState().setLoad({ data: profile, status: "success" }), [originalStore]);

  const startImpersonation = useCallback(
    (profile: unknown, replacedPersonId: string) => {
      const current = originalStore.getState().data ?? activeStore.getState().data;
      if (current !== undefined) setOriginal(current);
      apply(profile);
      if (persist && current !== undefined) writeImpersonation(stateKey, { original: current, replacedPersonId });
    },
    [originalStore, activeStore, setOriginal, apply, persist, stateKey],
  );

  const cancelImpersonation = useCallback(() => {
    originalStore.getState().clear();
    clearImpersonation(stateKey);
  }, [originalStore, stateKey]);

  const returnToOriginal = useCallback(() => {
    const own = originalStore.getState().data;
    if (own === undefined) return;
    // The admin's own list must not re-apply a switch saved while impersonating.
    sessionStore.getState().setReconciled(normalizeProfile(own, resolvedKeys).personId);
    apply(own);
    cancelImpersonation();
  }, [originalStore, sessionStore, resolvedKeys, apply, cancelImpersonation]);

  const setPending = useCallback((p: boolean) => sessionStore.getState().setPending(p), [sessionStore]);
  const setReconciled = useCallback((id: string | null) => sessionStore.getState().setReconciled(id), [sessionStore]);
  const claimRestore = useCallback(() => sessionStore.getState().claimRestore(), [sessionStore]);

  return {
    stateKey,
    keys: resolvedKeys,
    persist,
    active,
    activeProfile: useMemo(() => (active === undefined || active === null ? undefined : normalizeProfile(active, resolvedKeys)), [active, resolvedKeys]),
    original,
    originalProfile: useMemo(() => (original === undefined || original === null ? undefined : normalizeProfile(original, resolvedKeys)), [original, resolvedKeys]),
    isImpersonating: original !== undefined,
    pending,
    setPending,
    reconciledPersonId,
    setReconciled,
    claimRestore,
    apply,
    switchTo,
    startImpersonation,
    setOriginal,
    cancelImpersonation,
    returnToOriginal,
  };
}

/** `value` once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
