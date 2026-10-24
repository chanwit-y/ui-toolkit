import type { ComponentType, ReactNode } from "react";
import type { AppBarConfig } from "../../components/@types";
import { ButtonBase } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Paper } from "../../components/Paper";
import { Typography } from "../../components/Typography";
import { DEFAULT_SCREEN_TEXT, type AuthScreenText } from "./config";

/** What a replacement screen component receives (`GummyApp authScreens` / `AzureAuth screens`). */
export type AuthScreenProps = {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** The profile fetch's failure (denied screen). */
  error?: unknown;
  /** The signed-in account's email, when there is one. */
  email?: string;
  /** The configured texts, defaults applied. */
  text: Required<AuthScreenText>;
  /** The project's app bar (title / logo / icon), for branding. */
  appBar?: AppBarConfig;
};

export type AuthScreens = {
  landing?: ComponentType<AuthScreenProps>;
  denied?: ComponentType<AuthScreenProps>;
  loading?: ComponentType<AuthScreenProps>;
};

function Brand({ appBar }: { appBar?: AppBarConfig }) {
  if (!appBar?.logo && !appBar?.icon) return null;
  return (
    <div className="auth-card-brand" aria-hidden="true">
      {appBar.logo ? <img src={appBar.logo} alt="" className="auth-card-logo" style={appBar.logoSize ? { height: appBar.logoSize, width: "auto" } : undefined} /> : appBar.icon ? <Icon icon={appBar.icon} size={28} /> : null}
    </div>
  );
}

/** The shared card: brand, title, message, one action. */
export function AuthScreenCard({
  title,
  message,
  appBar,
  tone = "neutral",
  icon,
  children,
}: {
  title?: string;
  message?: string;
  appBar?: AppBarConfig;
  tone?: "neutral" | "danger";
  icon?: "shieldCheck" | "shieldAlert";
  children?: ReactNode;
}) {
  return (
    <div className="auth-screen" data-tone={tone}>
      <Paper elevation={3} className="auth-card">
        <Brand appBar={appBar} />
        {title && (
          <Typography variant="h5" className="auth-card-title">
            {title}
          </Typography>
        )}
        {message && (
          <div className="auth-card-message">
            {icon && <Icon icon={icon} size={18} className="auth-card-message-icon" />}
            <Typography variant="body2">{message}</Typography>
          </div>
        )}
        {children && <div className="auth-card-actions">{children}</div>}
      </Paper>
    </div>
  );
}

export function AuthLandingScreen({ signIn, text, appBar }: AuthScreenProps) {
  return (
    <AuthScreenCard title={text.title || appBar?.title} message={text.message} appBar={appBar} icon="shieldCheck">
      <ButtonBase label={text.buttonLabel} icon="logIn" onClick={() => void signIn()} />
    </AuthScreenCard>
  );
}

export function AuthDeniedScreen({ signOut, text, appBar }: AuthScreenProps) {
  return (
    <AuthScreenCard title={text.title} message={text.message} appBar={appBar} tone="danger" icon="shieldAlert">
      <ButtonBase label={text.buttonLabel} icon="logOut" variant="outlined" onClick={() => void signOut()} />
    </AuthScreenCard>
  );
}

export function AuthLoadingScreen({ text, appBar }: AuthScreenProps) {
  return (
    <AuthScreenCard appBar={appBar}>
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="auth-spinner" aria-hidden="true" />
        <Typography variant="body2">{text.message}</Typography>
      </div>
    </AuthScreenCard>
  );
}

/** The configured texts with the defaults filled, per screen. */
export function screenText(kind: "landing" | "denied" | "loading", configured: AuthScreenText | undefined): Required<AuthScreenText> {
  const d = DEFAULT_SCREEN_TEXT[kind] as AuthScreenText;
  return {
    title: configured?.title ?? d.title ?? "",
    message: configured?.message ?? d.message ?? "",
    buttonLabel: configured?.buttonLabel ?? d.buttonLabel ?? "",
  };
}
