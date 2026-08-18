/**
 * Saves a Blob under a filename.
 *
 * Course files are behind bearer auth, so they arrive as a Blob from an
 * authenticated request rather than through a link the browser can follow on
 * its own. This turns that Blob back into a normal download.
 *
 * The object URL is revoked afterwards; each one pins the whole file in memory
 * until it is released, which matters for the 200 MB the API allows.
 */
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};
