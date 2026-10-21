/**
 * Storage blobs load through the admin's own /api/backend proxy: the proxy
 * injects Authorization + X-Tenant-Id from the httpOnly session cookies, so
 * browser code never needs the raw tenant id. Downloads arrive with
 * Content-Disposition passthrough (see app/api/backend/[...path]/route.ts).
 */
export async function downloadFile(objectKey: string) {
  const response = await fetch(`/api/backend/storage/download?objectKey=${encodeURIComponent(objectKey)}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Unable to download file");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = objectKey.split("/").pop() || "download";
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Fetch a stored object as a blob for inline display (avatars, previews).
 * Plain `<img src>` cannot authenticate, so binary content is loaded here
 * and surfaced as an object URL. Callers must revoke the URL.
 */
export async function fetchFileBlob(objectKey: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(`/api/backend/storage/download?objectKey=${encodeURIComponent(objectKey)}`, {
    cache: "no-store",
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error(`Unable to load file (status ${response.status})`);
  const blob = await response.blob();
  if (blob.size === 0) throw new Error(`Unable to load file (status ${response.status}, 0 bytes received)`);
  return blob;
}
