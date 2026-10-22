import { Search, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CondExpression, FormListReadApi, NavigateTarget, ProfileKeys, ReplaceProfileElement } from "./@types";
import { Avatar } from "./Avatar";
import { ButtonBase } from "./Button";
import { initialsOf } from "./core/approvalSteps";
import { ConditionExpression, conditionStateKeys } from "./core/expression";
import { useNavigateTo } from "./core/pages";
import {
  normalizeProfile,
  pickDefaultProfile,
  profileListQueryKey,
  profileSubtitle,
  readImpersonation,
  useDebouncedValue,
  useProfileSession,
  type NormalizedProfile,
  type ProfileSession,
} from "./core/profileSession";
import { useStateVersion } from "./core/readApi";
import { useStord } from "./core/stord";
import { useReadApi } from "./core/useReadApi";
import { Modal } from "./Modal";

/** `reload` the named refetches and `navigate` after the active profile changed. */
export function useAfterProfileChange(reload: string[] | undefined, navigate: NavigateTarget | undefined): () => void {
  const fnCtxs = useStord((state) => state.fnCtxs);
  const navigateTo = useNavigateTo();
  const reloadSig = (reload ?? []).join("|");
  return useCallback(() => {
    for (const key of reload ?? []) {
      const fn = fnCtxs[key];
      if (fn) void fn();
      else console.warn(`[gummy-ui] profile reload: nothing registered under "${key}"`);
    }
    if (navigate) navigateTo(navigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadSig, fnCtxs, navigate, navigateTo]);
}

/** The rows of a profiles read: `api.paths` drills to the array; anything else is no profiles. */
function profileRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

/** The raw row to make active when nobody chose one: the primary assignment, else the first. */
function defaultProfileRow(rows: unknown[], keys: ProfileKeys): unknown {
  return pickDefaultProfile(rows.map((row) => normalizeProfile(row, keys)))?.raw;
}

/**
 * A persisted impersonation (sessionStorage) re-fetched on load by whichever
 * profile element claims it first: the stored original is put back, the
 * replaced person's profiles are fetched again rather than trusted from
 * storage (and cached for the session), and the primary / first one becomes
 * active; a failed or empty fetch drops the impersonation.
 */
export function useRestoreImpersonation(session: ProfileSession, api: FormListReadApi | undefined, personParam: string, name: string): void {
  const [personId, setPersonId] = useState<string | null>(null);
  const started = useRef(false);
  const { persist, stateKey, keys, isImpersonating, claimRestore, setOriginal, setPending, startImpersonation, cancelImpersonation, setProfiles } = session;

  useEffect(() => {
    if (started.current || !api || !persist || isImpersonating) return;
    started.current = true;
    const record = readImpersonation(stateKey);
    if (!record || !claimRestore()) return;
    setOriginal(record.original);
    setPending(true);
    setPersonId(record.replacedPersonId);
  }, [api, persist, isImpersonating, stateKey, claimRestore, setOriginal, setPending]);

  const read = useReadApi(name, api, { params: { [personParam]: personId ?? "" }, enabled: personId !== null, retry: false, queryKey: profileListQueryKey(stateKey) });

  useEffect(() => {
    if (personId === null) return;
    if (read.isError || (read.isSuccess && profileRows(read.data).length === 0)) {
      cancelImpersonation();
      setPending(false);
      setPersonId(null);
      return;
    }
    if (!read.isSuccess) return;
    const rows = profileRows(read.data);
    setProfiles(personId, rows);
    startImpersonation(defaultProfileRow(rows, keys), personId);
    setPending(false);
    setPersonId(null);
  }, [personId, read.isError, read.isSuccess, read.data, keys, cancelImpersonation, setPending, startImpersonation, setProfiles]);
}

/** A config condition over global state, re-evaluated as the slices it reads change; absent ⇒ true. */
function useCondition(condition: CondExpression | undefined): boolean {
  const sig = JSON.stringify(condition ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keys = useMemo(() => conditionStateKeys([condition]), [sig]);
  const version = useStateVersion(keys);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (condition ? new ConditionExpression({}).expression(condition) : true), [sig, version]);
}

export type ReplaceProfileTrigger = NonNullable<ReplaceProfileElement["trigger"]>;

export type ReplaceProfileViewProps = Pick<ReplaceProfileElement, "showBanner" | "returnLabel" | "className"> & {
  trigger?: ReplaceProfileTrigger;
  /** The impersonated profile, while impersonating. */
  viewingAs?: NormalizedProfile;
  /** Whether the trigger is offered (`canReplace`). */
  allowed?: boolean;
  onOpen?: () => void;
  onReturn?: () => void;
  style?: CSSProperties;
};

/**
 * The element's resting state, hook-free: the "Viewing as … — Return to my
 * profile" banner while impersonating and the trigger button when allowed.
 * Rendered by the engine element and the studio canvas.
 */
export function ReplaceProfileView({
  trigger,
  viewingAs,
  allowed = true,
  showBanner = true,
  returnLabel = "Return to my profile",
  onOpen,
  onReturn,
  className,
  style,
}: ReplaceProfileViewProps) {
  const label = trigger?.label ?? "Replace profile";
  if (!allowed && !(showBanner && viewingAs)) return null;
  return (
    <div className={`profile-replace ${className ?? ""}`} style={style}>
      {showBanner && viewingAs && (
        <div className="profile-banner" role="status">
          <Avatar src={viewingAs.avatar} alt="" size={28} fallback={initialsOf(viewingAs.name)} />
          <span className="profile-banner-text">
            Viewing as <strong>{viewingAs.name}</strong>
            {viewingAs.jobTitle ? <span className="profile-banner-sub"> · {viewingAs.jobTitle}</span> : null}
          </span>
          <button type="button" className="profile-banner-return" onClick={onReturn}>
            <Undo2 size={14} aria-hidden /> {returnLabel}
          </button>
        </div>
      )}
      {allowed && <ButtonBase label={label} icon={trigger?.icon ?? "userCog"} variant={trigger?.variant} onClick={onOpen} />}
    </div>
  );
}

export type ReplacePhase = "idle" | "pending" | "empty" | "error" | "done";

export type ReplaceProfileDialogProps = Pick<ReplaceProfileElement, "description" | "placeholder" | "confirmLabel" | "cancelLabel" | "emptyText"> & {
  keyword: string;
  onKeyword: (text: string) => void;
  /** The search is still debouncing or in flight. */
  searching: boolean;
  /** `true` once the current keyword's search answered. */
  searched: boolean;
  results: NormalizedProfile[];
  pendingPersonId: string | null;
  onPick: (personId: string | null) => void;
  phase: ReplacePhase;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** The profile being replaced (named in the description). */
  current?: NormalizedProfile;
};

/**
 * The dialog body, hook-free: a search box, the matching people (click to
 * pick — picking changes nothing), the status / error line and Cancel ·
 * Confirm (disabled until a pick; a spinner label while the profiles load).
 */
export function ReplaceProfileDialog({
  description,
  placeholder = "Search by name",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  emptyText = "No results",
  keyword,
  onKeyword,
  searching,
  searched,
  results,
  pendingPersonId,
  onPick,
  phase,
  error,
  onConfirm,
  onCancel,
  current,
}: ReplaceProfileDialogProps) {
  const replacing = phase === "pending";
  const blank = keyword.trim() === "";
  const status = blank ? "Type a name to search." : searching ? "Searching…" : searched && results.length === 0 ? emptyText : null;
  return (
    <div className="profile-dialog">
      <p className="profile-dialog-description">
        {description ?? (current ? `The app will be read as the person you pick, in place of ${current.name}.` : "The app will be read as the person you pick.")}
      </p>
      <label className="profile-search">
        <Search size={16} aria-hidden />
        <input
          type="search"
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
          placeholder={placeholder}
          disabled={replacing}
          autoFocus
          aria-label={placeholder}
        />
      </label>
      {status ? (
        <p className="profile-status">{status}</p>
      ) : (
        <ul className="profile-list profile-results" role="listbox" aria-label="People">
          {results.map((p) => {
            const picked = p.personId === pendingPersonId;
            const subtitle = profileSubtitle(p);
            return (
              <li
                key={p.personId}
                role="option"
                aria-selected={picked}
                tabIndex={0}
                className="profile-option profile-option-clickable"
                onClick={() => !replacing && onPick(picked ? null : p.personId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!replacing) onPick(picked ? null : p.personId);
                  }
                }}
              >
                <Avatar src={p.avatar} alt="" size={32} fallback={initialsOf(p.name)} className="profile-option-avatar" />
                <div className="profile-option-text">
                  <span className="profile-option-name">{p.name}</span>
                  {subtitle && <span className="profile-option-sub">{subtitle}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(phase === "error" || phase === "empty") && error && (
        <p className="profile-status profile-error" role="alert">
          {error}
        </p>
      )}
      <div className="profile-dialog-footer">
        <ButtonBase label={cancelLabel} variant="outlined" onClick={onCancel} />
        <ButtonBase label={replacing ? "Loading profile…" : confirmLabel} onClick={onConfirm} disabled={!pendingPersonId || replacing} />
      </div>
    </div>
  );
}

export type ReplaceProfileProps = Omit<ReplaceProfileElement, "searchApi" | "profilesApi"> & {
  searchApi: FormListReadApi;
  profilesApi: FormListReadApi;
};

const LOAD_FAILED = "Couldn't load the profile. Please try again.";
const NO_PROFILE = "This person has no active profile.";

/**
 * The bound element (see the grilled design): the search is debounced and
 * never sent blank; a pick is local to the dialog; only Confirm sets the
 * person whose profiles are fetched, and only a non-empty answer replaces
 * the active profile — the current one kept as the original, the choice
 * persisted, then `reload` / `navigate`. An empty list or a failure leaves
 * everything as it was and says so in the dialog.
 */
export function ReplaceProfile({
  name = "replaceProfile",
  stateKey,
  initial,
  keys,
  persist,
  reload,
  navigate,
  searchApi,
  searchParam = "search",
  debounceMs = 300,
  profilesApi,
  personParam,
  canReplace,
  trigger,
  title = "Replace profile",
  description,
  placeholder,
  confirmLabel,
  cancelLabel,
  returnLabel,
  emptyText,
  showBanner,
  className,
}: ReplaceProfileProps) {
  const session = useProfileSession({ stateKey, keys, initial, persist });
  const allowed = useCondition(canReplace);
  const after = useAfterProfileChange(reload, navigate);
  const param = personParam ?? profilesApi.urlParams?.[0] ?? "personId";
  useRestoreImpersonation(session, profilesApi, param, `${name}-restore`);

  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  // Picked in the list only; nothing happens until Confirm hands it over.
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);
  // Set by Confirm alone: the only thing that enables the profiles fetch.
  const [confirmedPersonId, setConfirmedPersonId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ReplacePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const trimmed = keyword.trim();
  const debounced = useDebouncedValue(trimmed, debounceMs);
  const search = useReadApi(`${name}-search`, searchApi, { query: { [searchParam]: debounced }, enabled: open && debounced !== "" });
  const results = useMemo(() => profileRows(search.data).map((row) => normalizeProfile(row, session.keys)), [search.data, session.keys]);

  const confirm = useReadApi(`${name}-confirm`, profilesApi, {
    params: { [param]: confirmedPersonId ?? "" },
    enabled: confirmedPersonId !== null,
    retry: false,
    queryKey: profileListQueryKey(session.stateKey),
  });

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setConfirmedPersonId(null);
    session.setPending(false);
  }, [session]);

  const close = useCallback(() => {
    setOpen(false);
    setKeyword("");
    setPendingPersonId(null);
    reset();
  }, [reset]);

  // Outcome of a confirmed replacement.
  const { startImpersonation, setPending, setProfiles } = session;
  useEffect(() => {
    if (phase !== "pending" || confirmedPersonId === null) return;
    if (confirm.isError) {
      setError(LOAD_FAILED);
      setPhase("error");
      setConfirmedPersonId(null);
      setPending(false);
      return;
    }
    if (!confirm.isSuccess) return;
    const rows = profileRows(confirm.data);
    const next = defaultProfileRow(rows, session.keys);
    if (next === undefined) {
      setError(NO_PROFILE);
      setPhase("empty");
      setConfirmedPersonId(null);
      setPending(false);
      return;
    }
    setProfiles(confirmedPersonId, rows);
    startImpersonation(next, confirmedPersonId);
    setPending(false);
    setPhase("done");
    setConfirmedPersonId(null);
    setOpen(false);
    setKeyword("");
    setPendingPersonId(null);
    after();
  }, [phase, confirmedPersonId, confirm.isError, confirm.isSuccess, confirm.data, session.keys, startImpersonation, setPending, setProfiles, after]);

  const onConfirm = () => {
    if (!pendingPersonId) return;
    setError(null);
    setPhase("pending");
    session.setPending(true);
    setConfirmedPersonId(pendingPersonId);
  };

  const onReturn = () => {
    session.returnToOriginal();
    after();
  };

  return (
    <>
      <ReplaceProfileView
        trigger={trigger}
        viewingAs={session.isImpersonating ? session.activeProfile : undefined}
        allowed={allowed}
        showBanner={showBanner}
        returnLabel={returnLabel}
        className={className}
        onOpen={() => {
          reset();
          setOpen(true);
        }}
        onReturn={onReturn}
      />
      <Modal id={`${name}-dialog`} title={title} open={open} onOpenChange={(next: boolean) => (next ? setOpen(true) : close())} width="480px">
        {open && (
          <ReplaceProfileDialog
            description={description}
            placeholder={placeholder}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            emptyText={emptyText}
            keyword={keyword}
            onKeyword={setKeyword}
            searching={trimmed !== "" && (trimmed !== debounced || search.isFetching)}
            searched={search.isSuccess && trimmed === debounced}
            results={results}
            pendingPersonId={pendingPersonId}
            onPick={setPendingPersonId}
            phase={phase}
            error={error}
            onConfirm={onConfirm}
            onCancel={close}
            current={session.activeProfile}
          />
        )}
      </Modal>
    </>
  );
}
