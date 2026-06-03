import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  LucideProps,
  X,
  XCircle,
} from "lucide-react";
import "./Snackbar.css";

export type SnackbarVariant =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "neutral";

export type SnackbarPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SnackbarOptions = {
  id?: string;
  title?: string;
  message: string;
  variant?: SnackbarVariant;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
};

type SnackbarMessage = {
  id: string;
  title?: string;
  message: string;
  variant: SnackbarVariant;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
  dismissible: boolean;
  createdAt: number;
};

export interface SnackbarProviderProps extends PropsWithChildren {
  duration?: number;
  position?: SnackbarPosition;
  maxSnackbars?: number;
  pauseOnHover?: boolean;
}

type SnackbarContextValue = {
  showSnackbar: (options: SnackbarOptions) => string;
  dismissSnackbar: (id: string) => void;
  clearSnackbars: () => void;
};

const defaultDuration = 4000;
const defaultPosition: SnackbarPosition = "bottom-right";
const defaultVariant: SnackbarVariant = "neutral";

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const variantIcons: Record<SnackbarVariant, ComponentType<LucideProps>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: Circle,
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `snackbar-${Date.now().toString(36)}-${Math.random()
    .toString(16)
    .slice(2, 8)}`;
};

const normalizeOptions = (options: SnackbarOptions): SnackbarMessage => {
  const {
    id = generateId(),
    title,
    message,
    variant = defaultVariant,
    duration = defaultDuration,
    actionLabel,
    onAction,
    dismissible = true,
  } = options;

  if (!message?.trim()) {
    throw new Error("Snackbar message cannot be empty");
  }

  return {
    id,
    title,
    message,
    variant,
    duration,
    actionLabel,
    onAction,
    dismissible,
    createdAt: Date.now(),
  };
};

export function SnackbarProvider({
  children,
  duration = defaultDuration,
  position = defaultPosition,
  maxSnackbars = 3,
  pauseOnHover = true,
}: SnackbarProviderProps) {
  const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const node = document.createElement("div");
    node.setAttribute("data-snackbar-portal", "true");
    document.body.append(node);
    portalRef.current = node;

    return () => {
      portalRef.current = null;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      const normalized = normalizeOptions({
        duration,
        ...options,
      });

      setSnackbars((prev) => {
        const next = [...prev, normalized];
        if (maxSnackbars > 0 && next.length > maxSnackbars) {
          return next.slice(next.length - maxSnackbars);
        }
        return next;
      });

      return normalized.id;
    },
    [duration, maxSnackbars],
  );

  const dismissSnackbar = useCallback((id: string) => {
    setSnackbars((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearSnackbars = useCallback(() => {
    setSnackbars([]);
  }, []);

  const value = useMemo(
    () => ({
      showSnackbar,
      dismissSnackbar,
      clearSnackbars,
    }),
    [showSnackbar, dismissSnackbar, clearSnackbars],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {portalRef.current
        ? createPortal(
            <SnackbarContainer
              snackbars={snackbars}
              position={position}
              pauseOnHover={pauseOnHover}
              onDismiss={dismissSnackbar}
            />,
            portalRef.current,
          )
        : null}
    </SnackbarContext.Provider>
  );
}

type SnackbarContainerProps = {
  snackbars: SnackbarMessage[];
  position: SnackbarPosition;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
};

const SnackbarContainer = ({
  snackbars,
  position,
  pauseOnHover,
  onDismiss,
}: SnackbarContainerProps) => {
  if (!snackbars.length) {
    return null;
  }

  return createElement(
    "div",
    {
      className: clsx("snackbar-container", `snackbar-container--${position}`),
      role: "region",
      "aria-live": "polite",
      "aria-relevant": "additions removals",
    },
    snackbars.map((snackbar) =>
      createElement(SnackbarItem, {
        key: snackbar.id,
        snackbar,
        pauseOnHover,
        onDismiss,
      }),
    ),
  );
};

type SnackbarItemProps = {
  snackbar: SnackbarMessage;
  pauseOnHover: boolean;
  onDismiss: (id: string) => void;
};

const SnackbarItem = ({ snackbar, pauseOnHover, onDismiss }: SnackbarItemProps) => {
  const { id, title, message, variant, duration, actionLabel, onAction, dismissible } =
    snackbar;
  const [isHovering, setIsHovering] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (duration <= 0 || duration === Infinity) return;
    if (pauseOnHover && isHovering) return;

    const timer = window.setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, pauseOnHover, isHovering, id, onDismiss]);

  const Icon = variantIcons[variant];

  return createElement(
    "div",
    {
      className: clsx(
        "snackbar",
        `snackbar--${variant}`,
        dismissible && "snackbar--dismissible",
      ),
      role: variant === "error" ? "alert" : "status",
      "aria-live": variant === "error" ? "assertive" : "polite",
      onMouseEnter: pauseOnHover
        ? () => {
            setIsHovering(true);
          }
        : undefined,
      onMouseLeave: pauseOnHover
        ? () => {
            setIsHovering(false);
          }
        : undefined,
    },
    createElement(
      "span",
      {
        className: "snackbar__icon",
        "aria-hidden": "true",
      },
      createElement(Icon, { size: 20 }),
    ),
    createElement(
      "div",
      { className: "snackbar__content" },
      title
        ? createElement("p", { className: "snackbar__title" }, title)
        : null,
      createElement(
        "p",
        { className: "snackbar__message" },
        ...message.split("\n").flatMap((line, i) =>
          i === 0 ? [line] : [createElement("br", { key: i }), line]
        ),
      ),
    ),
    actionLabel
      ? createElement(
          "button",
          {
            className: "snackbar__action",
            type: "button",
            onClick: () => {
              onAction?.();
              onDismiss(id);
            },
          },
          actionLabel,
        )
      : null,
    dismissible
      ? createElement(
          "button",
          {
            className: "snackbar__close",
            type: "button",
            onClick: () => onDismiss(id),
            "aria-label": "Dismiss notification",
          },
          createElement(X, { size: 16 }),
        )
      : null,
  );
};

export const useSnackbar = (): SnackbarContextValue => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};

export const SnackbarConsumer = SnackbarContext.Consumer;

