import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Popover } from "../../components/Popover";
import { Icon } from "../../components/Icon";
import { authInitials, DEFAULT_USER_MENU_KEYS, readKeyPath } from "./config";
import { useAuthOptional } from "./context";

/**
 * The signed-in user in the app bar (the Banpu profile menu): a trigger with
 * the avatar, name and job title opening a card — the company and **Sign out**
 * on top, then the large avatar, name, `idLabel: id` and job title. Reads the
 * profile slice by the configured `userMenu` keys, falling back to the
 * account; renders nothing outside an `AzureAuth`, while not signed in, or
 * when `userMenu.show` is false. `GummyApp` puts it after the `header` slot;
 * a hand-wired shell adds it to its own `header`.
 */
export function AuthUserMenu({ className }: { className?: string }) {
  const auth = useAuthOptional();
  const [open, setOpen] = useState(false);
  if (!auth || auth.status !== "signedIn" || auth.config.userMenu?.show === false) return null;
  const keys = { ...DEFAULT_USER_MENU_KEYS, ...auth.config.userMenu };
  const name = readKeyPath(auth.profile, keys.nameKey) || auth.account?.name || auth.account?.email || "";
  const subtitle = readKeyPath(auth.profile, keys.subtitleKey);
  const avatar = readKeyPath(auth.profile, keys.avatarKey) || undefined;
  const company = readKeyPath(auth.profile, keys.companyKey);
  const id = readKeyPath(auth.profile, keys.idKey);
  const email = auth.account?.email;
  const initials = authInitials(name);
  const card = (
    <div role="dialog" aria-label={`Account: ${name}`}>
      <div className="auth-user-card-head">
        <span className="auth-user-card-company">{company || name}</span>
        <button
          type="button"
          className="auth-user-card-signout"
          onClick={() => {
            setOpen(false);
            void auth.signOut();
          }}
        >
          Sign out
          <Icon icon="logOut" size={16} />
        </button>
      </div>
      <div className="auth-user-card-body">
        <Avatar src={avatar} alt="" size="xl" fallback={initials} />
        <div className="auth-user-card-text">
          <span className="auth-user-card-name">{name}</span>
          {id && (
            <span className="auth-user-card-line">
              {keys.idLabel}: {id}
            </span>
          )}
          {subtitle && <span className="auth-user-card-line">{subtitle}</span>}
          {email && email !== name && <span className="auth-user-card-line auth-user-card-email">{email}</span>}
        </div>
      </div>
    </div>
  );
  // The library Popover: portaled into the enclosing dialog when there is
  // one (a Radix dialog's focus trap and `pointer-events: none` on <body>
  // would otherwise swallow it) and positioned against the viewport — so the
  // card opens inside the studio Live Preview and any consumer modal too.
  return (
    <Popover content={card} placement="bottom-end" offset={6} open={open} onOpenChange={setOpen} contentClassName="auth-user-card">
      <button
        type="button"
        className={`auth-user-menu-trigger ${className ?? ""}`}
        aria-label={`Account: ${name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Avatar src={avatar} alt="" size="sm" fallback={initials} />
        <span className="auth-user-menu-lines">
          <span className="auth-user-menu-name">{name}</span>
          {subtitle && <span className="auth-user-menu-sub">{subtitle}</span>}
        </span>
        <Icon icon="chevronDown" size={16} className="auth-user-menu-chevron" />
      </button>
    </Popover>
  );
}
