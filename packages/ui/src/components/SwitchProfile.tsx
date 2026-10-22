import { Check } from "lucide-react";
import { useEffect, useMemo, type CSSProperties } from "react";
import type { FormListReadApi, SwitchProfileElement } from "./@types";
import { Avatar } from "./Avatar";
import { initialsOf } from "./core/approvalSteps";
import {
  normalizeProfile,
  pickRestoredProfile,
  profileSubtitle,
  readSwitchedUserId,
  useProfileSession,
  profileListQueryKey,
  type NormalizedProfile,
} from "./core/profileSession";
import { useAfterProfileChange, useRestoreImpersonation } from "./ReplaceProfile";
import { useReadApi } from "./core/useReadApi";
import { SelectFieldBase } from "./SelectField";
import { SkeletonBlock, SkeletonCircle } from "./Skeleton";

export type SwitchProfileStatus = "ready" | "loading" | "error";

export type SwitchProfileViewProps = Pick<SwitchProfileElement, "title" | "emptyText" | "hideWhenSingle" | "display" | "showSubtitle" | "className"> & {
  profiles: NormalizedProfile[];
  activeUserId?: string;
  status?: SwitchProfileStatus;
  onSelect?: (profile: NormalizedProfile) => void;
  style?: CSSProperties;
};

/**
 * The control itself, hook-free, in one of two displays: a vertical list (one
 * row per profile — avatar, name, position · company · department — the
 * active one checked, `role="listbox"` with `aria-selected`), or a dropdown
 * on the library `SelectFieldBase` whose value is the `userId` and label the
 * job title. `showSubtitle` governs the "company · department" part in both.
 * Rendered by the engine element and the studio canvas.
 */
export function SwitchProfileView({
  title = "Switch profile",
  emptyText = "No other profile.",
  hideWhenSingle = true,
  display = "list",
  showSubtitle = true,
  profiles,
  activeUserId,
  status = "ready",
  onSelect,
  className,
  style,
}: SwitchProfileViewProps) {
  if (status === "ready" && hideWhenSingle && profiles.length <= 1) return null;
  const sectionClass = `profile-switch ${display === "dropdown" ? "profile-switch-dropdown" : ""} ${className ?? ""}`;
  if (display === "dropdown") {
    return (
      <section className={sectionClass} style={style} aria-busy={status === "loading"}>
        {status === "loading" ? (
          <div aria-hidden>
            {title && <SkeletonBlock height={12} width="40%" style={{ marginBottom: 6 }} />}
            <SkeletonBlock height={32} width="100%" />
          </div>
        ) : status === "error" ? (
          <p className="profile-status profile-error">Couldn't load the profiles.</p>
        ) : profiles.length === 0 ? (
          <p className="profile-status">{emptyText}</p>
        ) : (
          <SelectFieldBase
            label={title || undefined}
            aria-label={title || "Profiles"}
            placeholder="Choose a profile"
            options={profiles.map((p) => ({ value: p.userId, label: profileSubtitle(p, showSubtitle) || p.name }))}
            value={activeUserId}
            onValueChange={(userId: string) => {
              const picked = profiles.find((p) => p.userId === userId);
              if (picked) onSelect?.(picked);
            }}
          />
        )}
      </section>
    );
  }
  return (
    <section className={sectionClass} style={style} aria-busy={status === "loading"}>
      {title && <h3 className="profile-switch-title">{title}</h3>}
      {status === "loading" ? (
        <ul className="profile-list" aria-hidden>
          {[0, 1].map((i) => (
            <li key={i} className="profile-option">
              <SkeletonCircle size={32} />
              <div className="profile-option-text" style={{ width: "100%" }}>
                <SkeletonBlock height={12} width="55%" />
                <SkeletonBlock height={10} width="80%" style={{ marginTop: 4 }} />
              </div>
            </li>
          ))}
        </ul>
      ) : status === "error" ? (
        <p className="profile-status profile-error">Couldn't load the profiles.</p>
      ) : profiles.length === 0 ? (
        <p className="profile-status">{emptyText}</p>
      ) : (
        <ul className="profile-list" role="listbox" aria-label={title || "Profiles"}>
          {profiles.map((p) => {
            const active = p.userId === activeUserId;
            const subtitle = profileSubtitle(p, showSubtitle);
            return (
              <li
                key={p.userId}
                role="option"
                aria-selected={active}
                tabIndex={0}
                className="profile-option profile-option-clickable"
                onClick={() => onSelect?.(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(p);
                  }
                }}
              >
                <Avatar src={p.avatar} alt="" size={32} fallback={initialsOf(p.name)} className="profile-option-avatar" />
                <div className="profile-option-text">
                  <span className="profile-option-name">{p.name}</span>
                  {subtitle && <span className="profile-option-sub">{subtitle}</span>}
                </div>
                {active && (
                  <span className="profile-option-check" aria-hidden>
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type SwitchProfileProps = Omit<SwitchProfileElement, "api"> & { api: FormListReadApi };

/**
 * The bound element: shows the active person's profiles from the session's
 * per-person cache (filled by Replace's Confirm, the restore, or this element's
 * own fetch through `api` with the person id in `personParam` — only for a
 * person not seen yet in this page session), reconciles the list with the
 * saved switch once per person (the saved profile when still listed, else the
 * primary / first), and makes a picked profile active — no API call on the
 * pick — persisted, then `reload` / `navigate`.
 */
export function SwitchProfile({ name = "switchProfile", api, personParam, stateKey, initial, keys, persist, reload, navigate, ...view }: SwitchProfileProps) {
  const session = useProfileSession({ stateKey, keys, initial, persist });
  const after = useAfterProfileChange(reload, navigate);
  const param = personParam ?? api.urlParams?.[0] ?? "personId";
  // A persisted impersonation is restored by whichever profile element mounts first.
  useRestoreImpersonation(session, api, param, `${name}-restore`);
  const personId = session.activeProfile?.personId ?? "";
  const cached = personId === "" ? undefined : session.profilesOf(personId);
  const failed = personId !== "" && session.profilesFailed(personId);
  const read = useReadApi(name, api, {
    params: { [param]: personId },
    enabled: personId !== "" && cached === undefined && !failed,
    retry: false,
    queryKey: profileListQueryKey(session.stateKey),
  });

  // Whatever this element fetched goes into the shared cache (and the slice).
  const { setProfiles, setProfilesError } = session;
  useEffect(() => {
    if (personId === "" || !read.isFetched) return;
    if (read.isError) setProfilesError(personId, read.error);
    else if (read.isSuccess) setProfiles(personId, Array.isArray(read.data) ? read.data : []);
  }, [personId, read.isFetched, read.isError, read.isSuccess, read.data, read.error, setProfiles, setProfilesError]);

  const profiles = useMemo(() => (cached ?? []).map((row) => normalizeProfile(row, session.keys)), [cached, session.keys]);

  // Once per person: the saved choice when still in the list, else the primary / first profile.
  const { activeProfile, pending, reconciledPersonId, setReconciled, apply } = session;
  useEffect(() => {
    if (!activeProfile || profiles.length === 0 || pending) return;
    if (reconciledPersonId === activeProfile.personId) return;
    if (!profiles.some((p) => p.personId === activeProfile.personId)) return;
    setReconciled(activeProfile.personId);
    const target = pickRestoredProfile(profiles, session.persist ? readSwitchedUserId(session.stateKey) : null);
    if (target && target.userId !== activeProfile.userId) {
      apply(target.raw);
      after();
    }
  }, [activeProfile, profiles, pending, reconciledPersonId, setReconciled, apply, after, session.persist, session.stateKey]);

  const status: SwitchProfileStatus = personId === "" ? "ready" : failed ? "error" : cached === undefined ? "loading" : "ready";
  return (
    <SwitchProfileView
      {...view}
      profiles={profiles}
      activeUserId={activeProfile?.userId}
      status={status}
      onSelect={(p) => {
        if (p.userId === activeProfile?.userId) return;
        session.switchTo(p.raw);
        after();
      }}
    />
  );
}
