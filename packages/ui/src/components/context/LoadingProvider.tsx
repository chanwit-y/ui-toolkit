import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import "./LoadingProvider.css";

type LoadingContextValue = {
  isLoading: boolean;
  activeLoaderIds: string[];
  startLoading: (loaderId?: string) => string;
  stopLoading: (loaderId: string) => void;
  clearLoaders: () => void;
  withLoading: <T>(task: () => Promise<T>, loaderId?: string) => Promise<T>;
};

type LoadingOverlayRenderProps = {
  isLoading: boolean;
  activeLoaderIds: string[];
};

export type LoadingProviderProps = PropsWithChildren<{
  delay?: number;
  overlay?: ReactNode | ((props: LoadingOverlayRenderProps) => ReactNode);
  lockScroll?: boolean;
}>;

const LoadingContext = createContext<LoadingContextValue | null>(null);

const generateLoaderId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `loader-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
};

export function LoadingProvider({
  children,
  delay = 150,
  overlay,
  lockScroll = true,
}: LoadingProviderProps) {
  const [activeLoaders, setActiveLoaders] = useState<Map<string, number>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const addLoader = useCallback((loaderId: string) => {
    setActiveLoaders((prev) => {
      if (prev.has(loaderId)) {
        return prev;
      }
      const next = new Map(prev);
      next.set(loaderId, Date.now());
      return next;
    });
  }, []);

  const removeLoader = useCallback((loaderId: string) => {
    setActiveLoaders((prev) => {
      if (!prev.has(loaderId)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(loaderId);
      return next;
    });
  }, []);

  const startLoading = useCallback(
    (loaderId?: string) => {
      const id = loaderId ?? generateLoaderId();
      addLoader(id);
      return id;
    },
    [addLoader],
  );

  const stopLoading = useCallback(
    (loaderId: string) => {
      removeLoader(loaderId);
    },
    [removeLoader],
  );

  const clearLoaders = useCallback(() => {
    setActiveLoaders(new Map());
  }, []);

  const withLoading = useCallback(
    async <T,>(task: () => Promise<T>, loaderId?: string) => {
      const id = startLoading(loaderId);
      try {
        return await task();
      } finally {
        stopLoading(id);
      }
    },
    [startLoading, stopLoading],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const node = document.createElement("div");
    node.setAttribute("data-loading-portal", "true");
    document.body.append(node);
    portalRef.current = node;

    return () => {
      if (timerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      portalRef.current = null;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  const isLoading = activeLoaders.size > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsVisible(isLoading);
      return;
    }

    if (isLoading) {
      if (timerRef.current === null) {
        timerRef.current = window.setTimeout(() => {
          setIsVisible(true);
        }, delay);
      }
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsVisible(false);
  }, [delay, isLoading]);

  useEffect(() => {
    if (!lockScroll || !isLoading || typeof document === "undefined") {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isLoading, lockScroll]);

  const activeLoaderIds = useMemo(
    () => Array.from(activeLoaders.keys()),
    [activeLoaders],
  );

  const contextValue = useMemo<LoadingContextValue>(
    () => ({
      isLoading,
      activeLoaderIds,
      startLoading,
      stopLoading,
      clearLoaders,
      withLoading,
    }),
    [activeLoaderIds, clearLoaders, isLoading, startLoading, stopLoading, withLoading],
  );

  const renderOverlay = useMemo(() => {
    if (!portalRef.current || !isVisible || !isLoading) {
      return null;
    }

    const content =
      typeof overlay === "function"
        ? overlay({ isLoading, activeLoaderIds })
        : overlay;

    return createPortal(
      content ?? (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-overlay__content">
            <Loader2 className="loading-overlay__spinner" aria-hidden="true" />
            <span className="loading-overlay__label">Loading…</span>
          </div>
        </div>
      ),
      portalRef.current,
    );
  }, [activeLoaderIds, isLoading, isVisible, overlay]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {renderOverlay}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};


