import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { FilePreviewElement, FormListReadApi, PreviewFile } from "./@types";
import { fileKind } from "../util/file";
import { normalizePreviewFile } from "./core/previewFile";
import { useDataValue, useSkeleton } from "./core/rowScope";
import { useReadApi } from "./core/useReadApi";
import { FilePreviewActions, FilePreviewBody, useFilePreview } from "./FilePreviewBody";
import { SkeletonBlock } from "./Skeleton";
import { FileKindIcon, formatFileSize } from "./UploadFileParts";
import { UploadFileViewer } from "./UploadFileViewer";

const DEFAULT_HEIGHT = "320px";

export type FilePreviewViewProps = Pick<FilePreviewElement, "height" | "fit" | "showHeader" | "openOnClick" | "emptyText" | "blurhashDelay" | "className"> & {
  file?: PreviewFile;
  /** Draw the placeholder instead (the bound slice or the read is still loading). */
  skeleton?: boolean;
  /** The read failed: the error state, with Retry when `onRetry` is given. */
  error?: boolean;
  onRetry?: () => void;
  /** Drawn over the frame's corner (the studio's "Sample file" pill). */
  badge?: ReactNode;
  style?: CSSProperties;
};

function Message({ children }: { children: ReactNode }) {
  return <div className="gummy-fp-message">{children}</div>;
}

function FileFrame({
  file,
  height,
  showHeader,
  openOnClick,
  blurhashDelay,
  fit,
}: Required<Pick<FilePreviewViewProps, "height" | "showHeader" | "openOnClick">> & Pick<FilePreviewViewProps, "blurhashDelay" | "fit"> & { file: PreviewFile }) {
  const [attempt, setAttempt] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string>();
  const [open, setOpen] = useState(false);
  const preview = useFilePreview(file, attempt);
  const { mode, url } = preview;
  const failed = preview.failed || (url !== undefined && failedUrl === url);
  const retry = () => {
    setFailedUrl(undefined);
    setAttempt((n) => n + 1);
  };
  // Only an image can size itself: an `<iframe>` or a `<pre>` needs a height.
  const bodyHeight = height === "auto" && mode !== "image" ? DEFAULT_HEIGHT : height;
  const actions = <FilePreviewActions file={file} preview={preview} className="gummy-fp-action" />;
  const meta = [file.name, file.size !== undefined ? formatFileSize(file.size) : null].filter(Boolean).join(" · ");

  return (
    <>
      {showHeader && (
        <div className="gummy-fp-header">
          <FileKindIcon kind={fileKind(file)} className="h-4 w-4 shrink-0 text-[var(--gray-11)]" />
          <span className="gummy-fp-name" title={file.name}>{file.name}</span>
          {file.size !== undefined && <span className="gummy-fp-size">{formatFileSize(file.size)}</span>}
          <span className="gummy-fp-actions">{actions}</span>
        </div>
      )}
      <div className="gummy-fp-body" style={{ height: bodyHeight }}>
        {failed ? (
          <Message>
            <span>Couldn't load this file</span>
            <button type="button" className="gummy-fp-retry" onClick={retry}>Retry</button>
          </Message>
        ) : (
          <FilePreviewBody
            key={attempt}
            file={file}
            preview={preview}
            onLoadError={() => setFailedUrl(url)}
            blurhashDelay={blurhashDelay}
            fit={fit}
            noPreview={!showHeader && (
              <>
                <span className="text-xs">{meta}</span>
                <span className="gummy-fp-actions">{actions}</span>
              </>
            )}
          />
        )}
        {openOnClick && !failed && mode !== "none" && (
          <button type="button" className="gummy-fp-open" aria-label={`Open ${file.name}`} onClick={() => setOpen(true)} />
        )}
      </div>
      {open && <UploadFileViewer files={[file]} index={0} onIndexChange={(index) => setOpen(index !== null)} />}
    </>
  );
}

/**
 * The preview itself, hook-light and fed with one normalized file: the header,
 * the file drawn at `height`, and the states around it. Rendered by the engine
 * builder and by the studio canvas alike. `key`ed by the file's source, so a
 * failed load or an opened viewer doesn't carry over to the next file.
 */
export function FilePreviewView({
  file,
  skeleton = false,
  error = false,
  onRetry,
  height = DEFAULT_HEIGHT,
  showHeader = true,
  openOnClick = false,
  emptyText = "Select a file to preview",
  blurhashDelay,
  fit,
  badge,
  className,
  style,
}: FilePreviewViewProps) {
  const bodyHeight = height === "auto" ? DEFAULT_HEIGHT : height;
  let content: ReactNode;
  if (skeleton) {
    content = (
      <>
        {showHeader && (
          <div className="gummy-fp-header">
            <SkeletonBlock height={14} width="45%" />
          </div>
        )}
        <div className="gummy-fp-body" style={{ height: bodyHeight }}>
          <SkeletonBlock height="100%" />
        </div>
      </>
    );
  } else if (error) {
    content = (
      <div className="gummy-fp-body" style={{ height: bodyHeight }}>
        <Message>
          <span>Couldn't load this file</span>
          {onRetry && <button type="button" className="gummy-fp-retry" onClick={onRetry}>Retry</button>}
        </Message>
      </div>
    );
  } else if (!file) {
    content = (
      <div className="gummy-fp-body" style={{ height: bodyHeight }}>
        <Message>{emptyText}</Message>
      </div>
    );
  } else {
    content = <FileFrame key={file.url ?? file.name} file={file} height={height} showHeader={showHeader} openOnClick={openOnClick} blurhashDelay={blurhashDelay} fit={fit} />;
  }
  return (
    <div
      className={`gummy-surface gummy-fp ${className ?? ""}`}
      style={style}
      role="figure"
      aria-label={file?.name ?? "File preview"}
      aria-busy={skeleton || undefined}
    >
      {badge}
      {content}
    </div>
  );
}

export type FilePreviewProps = Omit<FilePreviewElement, "name" | "api"> & {
  name?: string;
  /** `api` resolved against the ApiMaster (the builder does it). */
  api?: FormListReadApi;
  /** The API base a root-relative URL is joined to (the builder passes the HTTP client's). */
  baseUrl?: string;
};

/**
 * The bound preview (the `filepreview` element): reads the file from `value`
 * or its own `api` and normalizes it through `keys` / `urlTemplate`. It reads
 * and never writes, so a file collection, a table selection or an upload feeds
 * it the same way: through a slice.
 */
export function FilePreview({ name = "filePreview", value, api, keys, urlTemplate, blurhash, showBlurhash, baseUrl, ...view }: FilePreviewProps) {
  const scoped = useDataValue(api ? undefined : value);
  const pending = useSkeleton(api ? undefined : value);
  const read = useReadApi(name, api);
  const raw = api ? read.data : scoped;
  const file = useMemo(
    () => normalizePreviewFile(raw, { keys, urlTemplate, baseUrl, blurhash, showBlurhash }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, baseUrl, urlTemplate, blurhash, showBlurhash, JSON.stringify(keys)],
  );
  const loading = !!api && !read.held && read.isLoading;
  return (
    <FilePreviewView
      {...view}
      file={file}
      skeleton={pending || loading}
      error={!!api && read.isError}
      onRetry={api ? () => void read.refetch() : undefined}
    />
  );
}
