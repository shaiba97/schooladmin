"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadFile, fetchFileBlob } from "@/lib/api/storage";
import { academicErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ViewableDocument = {
  objectKey: string;
  originalName?: string | null;
  contentType?: string | null;
};

const PAGE_ASPECT_RATIO = "1 / 1.4142";
const LOAD_TIMEOUT_MS = 30_000;

type DocumentKind = "image" | "pdf" | "unknown";

/**
 * Downloads arrive with no Content-Type (the API sends Content-Disposition
 * only) and records can carry `application/octet-stream`, so the declared
 * type is unreliable. The leading bytes are the only trustworthy signal.
 */
async function sniffDocumentKind(blob: Blob): Promise<DocumentKind> {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return "image";
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return "image";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image";
  if (startsWith(0x42, 0x4d)) return "image";
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image";
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "pdf";
  return "unknown";
}

function useDocumentBlob(document: ViewableDocument | null | undefined, reloadToken = 0) {
  const [loaded, setLoaded] = React.useState<{
    objectKey: string;
    url: string;
    isImage: boolean;
    kind: DocumentKind;
    size: number;
    declaredType: string;
  } | null>(null);
  const [failure, setFailure] = React.useState<{ objectKey: string; message: string } | null>(null);
  const objectKey = document?.objectKey ?? "";
  const contentType = document?.contentType ?? "";

  React.useEffect(() => {
    if (!objectKey) return;
    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    fetchFileBlob(objectKey, controller.signal)
      .then(async (blob) => {
        const kind = await sniffDocumentKind(blob);
        if (!active) return;
        const declaredType = blob.type || contentType || "unknown";
        objectUrl = URL.createObjectURL(blob);
        setLoaded({
          objectKey,
          url: objectUrl,
          kind,
          isImage: kind === "image" || (kind === "unknown" && declaredType.startsWith("image/")),
          size: blob.size,
          declaredType,
        });
      })
      .catch((cause) => {
        if (!active) return;
        const timedOut = cause instanceof DOMException && cause.name === "AbortError";
        setFailure({
          objectKey,
          message: timedOut
            ? `Timed out after ${LOAD_TIMEOUT_MS / 1000}s while loading this document. The file may not be readable on the server — try Download or re-upload it.`
            : academicErrorMessage(cause, "Unable to load document"),
        });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectKey, contentType, reloadToken]);

  const settled = loaded?.objectKey === objectKey || failure?.objectKey === objectKey;
  return {
    state: loaded?.objectKey === objectKey ? loaded : null,
    error: failure?.objectKey === objectKey ? failure.message : "",
    loading: Boolean(objectKey) && !settled,
  };
}

function DocumentFrame({
  url,
  isImage,
  kind,
  name,
  compact,
}: {
  url: string;
  isImage: boolean;
  kind: DocumentKind;
  name: string;
  compact?: boolean;
}) {
  const [brokenUrl, setBrokenUrl] = React.useState<string | null>(null);
  const broken = brokenUrl === url;

  if (isImage) {
    return (
      <div className="flex justify-center overflow-auto rounded-lg border bg-muted/30 p-2">
        {broken ? (
          <p className="flex min-h-32 w-full items-center justify-center px-4 text-center text-sm text-destructive">
            This image could not be displayed. Use Download to open the original file.
          </p>
        ) : (
          <Image
            src={url}
            alt={name}
            width={1200}
            height={1600}
            // Blob URLs are already in-memory: skip the optimizer pipeline.
            unoptimized
            onError={() => setBrokenUrl(url)}
            className={cn(
              "h-auto w-auto max-w-full rounded object-contain",
              compact ? "max-h-64" : "max-h-[70vh]",
            )}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn("mx-auto w-full overflow-hidden rounded-lg border bg-muted/30", compact ? "max-w-sm" : "max-w-2xl")}
        style={{ aspectRatio: PAGE_ASPECT_RATIO, maxHeight: compact ? 320 : "70vh" }}
      >
        <iframe src={url} title={name} className="size-full" />
      </div>
      <p className="text-xs text-muted-foreground">
        {kind === "unknown"
          ? "File type could not be identified — if nothing appears below, use Download."
          : "If nothing appears above, use Download to open the original file."}
      </p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentViewer({
  document,
  className,
}: {
  document: ViewableDocument | null | undefined;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState("");
  const [reloadToken, setReloadToken] = React.useState(0);
  const { state, error, loading } = useDocumentBlob(document, reloadToken);
  const name = document?.originalName || document?.objectKey?.split("/").pop() || "Document";
  const message = actionError || error;
  const unrecognised = Boolean(state) && state?.kind === "unknown";

  async function handleDownload() {
    if (!document?.objectKey) return;
    setActionError("");
    try {
      await downloadFile(document.objectKey);
    } catch (cause) {
      setActionError(academicErrorMessage(cause, "Unable to download document"));
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {message ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{message}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setActionError("");
              setReloadToken((token) => token + 1);
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {state ? (
        <DocumentFrame
          key={document?.objectKey}
          url={state.url}
          isImage={state.isImage}
          kind={state.kind}
          name={name}
          compact
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {loading ? "Loading document…" : "Preview unavailable"}
        </div>
      )}

      {state && (unrecognised || state.declaredType === "unknown" || state.declaredType === "application/octet-stream") ? (
        <p className="text-xs text-muted-foreground">
          Detected {state.kind === "unknown" ? "unrecognised file type" : state.kind} · {formatBytes(state.size)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (state) {
              setOpen(true);
            } else {
              setActionError("");
              setReloadToken((token) => token + 1);
            }
          }}
        >
          <Eye size={14} aria-hidden /> {state ? "View" : "Load"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
          <Printer size={14} aria-hidden /> Print
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleDownload()}>
          <Download size={14} aria-hidden /> Download
        </Button>
        <span className="min-w-0 truncate text-xs text-muted-foreground">{name}</span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          {state ? (
            <DocumentFrame key={document?.objectKey} url={state.url} isImage={state.isImage} kind={state.kind} name={name} />
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer size={14} aria-hidden /> Print
            </Button>
            <Button type="button" onClick={() => void handleDownload()}>
              <Download size={14} aria-hidden /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
