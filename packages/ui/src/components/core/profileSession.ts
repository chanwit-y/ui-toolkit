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
 * access is wrapped, so the app works without storage. A person's profile
 * list is fetched once per page session by whichever element needs it first
 * (Replace's Confirm, the restore, Switch) and cached per person here; the
 * active person's rows are published as the `<stateKey>List` slice. Pure
 * helpers are tested in `profileSession.test.ts`.
 */

export const DEFAULT_PROFILE_STATE_KEY = "profile";

/** Paths that fit the default user-profile shape out of the box. */
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
  primary: ["isPrimaryAssignment", "IsPrimaryAssignment", "isPrimary"],
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
  /** The primary assignment (see `isPrimaryValue`). */
  primary: boolean;
  raw: unknown;
};

export function originalStateKey(stateKey: string): string {
  return `${stateKey}Original`;
}

/** The slice holding the active person's profile rows (raw, as the endpoint returned them). */
export function listStateKey(stateKey: string): string {
  return `${stateKey}List`;
}

/** The react-query key family every profile element of one slice fetches a person's profiles under (one request per person, however many elements). */
export function profileListQueryKey(stateKey: string): string {
  return `profile-list:${stateKey}`;
}

/** The permissive truthiness of a primary-assignment flag: `true`, `1`, `"1"`, `"Y"`, `"true"` (case-insensitive). */
export function isPrimaryValue(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "y" || s === "yes" || s === "true";
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
    primary: isPrimaryValue(readKey(raw, k.primary)),
    raw,
  };
}

/** "Position · Company · Department" — what tells one profile of a person from another. */
export function profileSubtitle(p: Pick<NormalizedProfile, "jobTitle" | "company" | "department">, showSubtitle = true): string {
  return [p.jobTitle, ...(showSubtitle ? [p.company, p.department] : [])].filter(Boolean).join(" · ");
}

/**
 * Which profile to make active when nobody chose one: the first primary
 * assignment, else the first row — the replaced person's starting profile on
 * Confirm, the fallback of a restore / an unsaved reconcile.
 */
export function pickDefaultProfile<T extends { primary: boolean }>(profiles: T[]): T | undefined {
  return profiles.find((p) => p.primary) ?? profiles[0];
}

/**
 * Which of a person's profiles to make active on load: the saved one when it
 * is still in the list (the user chose it), else the default.
 */
export function pickRestoredProfile<T extends { userId: string; primary: boolean }>(profiles: T[], savedUserId: string | null | undefined): T | undefined {
  if (profiles.length === 0) return undefined;
  return (savedUserId && profiles.find((p) => p.userId === savedUserId)) || pickDefaultProfile(profiles);
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
  /** Raw profile rows per personId, as fetched once in this page session. */
  lists: Record<string, unknown[]>;
  /** A failed list fetch per personId (cleared by a later success). */
  listErrors: Record<string, unknown>;
  setPending: (pending: boolean) => void;
  setReconciled: (personId: string | null) => void;
  claimRestore: () => boolean;
  setList: (personId: string, rows: unknown[]) => void;
  setListError: (personId: string, error: unknown) => void;
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
      lists: {},
      listErrors: {},
      setPending: (pending) => set({ pending }),
      setReconciled: (reconciledPersonId) => set({ reconciledPersonId }),
      claimRestore: () => {
        if (get().restoreClaimed) return false;
        set({ restoreClaimed: true });
        return true;
      },
      setList: (personId, rows) =>
        set((s) => {
          const { [personId]: _dropped, ...listErrors } = s.listErrors;
          return { lists: { ...s.lists, [personId]: rows }, listErrors };
        }),
      setListError: (personId, error) => set((s) => ({ listErrors: { ...s.listErrors, [personId]: error ?? new Error("Couldn't load the profiles.") } })),
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
  /** The cached raw rows of a person's profiles (`undefined` until fetched); reactive. */
  profilesOf: (personId: string) => unknown[] | undefined;
  /** Whether the person's list fetch failed; reactive. */
  profilesFailed: (personId: string) => boolean;
  /** Cache a fetched list (the whole page session reuses it). */
  setProfiles: (personId: string, rows: unknown[]) => void;
  setProfilesError: (personId: string, error: unknown) => void;
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
  const listStore = useMemo(() => getStateStore(listStateKey(stateKey)), [stateKey]);
  const sessionStore = useMemo(() => getProfileSessionStore(stateKey), [stateKey]);
  const active = useSliceData(activeStore);
  const original = useSliceData(originalStore);
  const pending = sessionStore((s) => s.pending);
  const reconciledPersonId = sessionStore((s) => s.reconciledPersonId);
  const lists = sessionStore((s) => s.lists);
  const listErrors = sessionStore((s) => s.listErrors);
  const initialValue = useDataValue(initial);
  const activeProfile = useMemo(() => (active === undefined || active === null ? undefined : normalizeProfile(active, resolvedKeys)), [active, resolvedKeys]);

  // Publish the active person's list as the `<stateKey>List` slice: the cached
  // rows, `error` after a failed fetch, `loading` while unknown (an element is
  // expected to fetch it), `idle` without an active profile.
  useEffect(() => {
    const personId = activeProfile?.personId;
    const slice = listStore.getState();
    if (!personId) {
      if (slice.status !== "idle") slice.clear();
      return;
    }
    const rows = lists[personId];
    if (rows !== undefined) {
      if (slice.data !== rows) slice.setLoad({ data: rows, status: "success" });
      return;
    }
    if (personId in listErrors) {
      if (slice.status !== "error") slice.setLoad({ data: undefined, status: "error", error: listErrors[personId] });
      return;
    }
    if (slice.status !== "loading" || slice.data !== undefined) slice.setLoad({ data: undefined, status: "loading" });
  }, [activeProfile?.personId, lists, listErrors, listStore]);

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

  const profilesOf = useCallback((personId: string) => lists[personId], [lists]);
  const profilesFailed = useCallback((personId: string) => personId in listErrors, [listErrors]);
  const setProfiles = useCallback((personId: string, rows: unknown[]) => sessionStore.getState().setList(personId, rows), [sessionStore]);
  const setProfilesError = useCallback((personId: string, error: unknown) => sessionStore.getState().setListError(personId, error), [sessionStore]);
  const setPending = useCallback((p: boolean) => sessionStore.getState().setPending(p), [sessionStore]);
  const setReconciled = useCallback((id: string | null) => sessionStore.getState().setReconciled(id), [sessionStore]);
  const claimRestore = useCallback(() => sessionStore.getState().claimRestore(), [sessionStore]);

  return {
    stateKey,
    keys: resolvedKeys,
    persist,
    active,
    activeProfile,
    original,
    originalProfile: useMemo(() => (original === undefined || original === null ? undefined : normalizeProfile(original, resolvedKeys)), [original, resolvedKeys]),
    isImpersonating: original !== undefined,
    pending,
    setPending,
    reconciledPersonId,
    setReconciled,
    claimRestore,
    profilesOf,
    profilesFailed,
    setProfiles,
    setProfilesError,
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

/**
 * Forget everything of one `stateKey`'s profile session — the active /
 * original / list slices, the persisted impersonation and the remembered
 * switch, the coordination store — before a sign-out, so the next account
 * starts clean.
 */
export function clearProfileSession(stateKey: string = DEFAULT_PROFILE_STATE_KEY): void {
  getStateStore(stateKey).getState().clear();
  getStateStore(originalStateKey(stateKey)).getState().clear();
  getStateStore(listStateKey(stateKey)).getState().clear();
  clearImpersonation(stateKey);
  writeItem(local, switchedKey(stateKey), null);
  const session = sessions.get(stateKey);
  if (session) {
    session.setState({ pending: false, reconciledPersonId: null, restoreClaimed: false, lists: {}, listErrors: {} });
  }
}
