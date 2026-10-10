// Helpers shared by the tools that publish recordings to the voice Blob store.
// Uses the store's upload endpoint directly (no install): the Vercel CLI cannot
// turn off random file-name suffixes, and these URLs must be stable.
export const BLOB_API = "https://vercel.com/api/blob/";
export const CACHE_SECONDS = 31536000; // a year: every URL carries a version, see FAMILY_VOICE_VERSION / NARRATION_VERSION

/** Size in bytes of a stored file, or null when it is not in the store. */
export async function remoteSize(url) {
  const res = await fetch(url, { method: "HEAD" });
  return res.ok ? Number(res.headers.get("content-length")) : null;
}

/** Uploads one file under a stable name; overwrites an existing one. */
export async function putBlob({ token, pathname, body, contentType = "audio/mpeg" }) {
  const res = await fetch(`${BLOB_API}?pathname=${encodeURIComponent(pathname)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "11",
      "x-vercel-blob-access": "public",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "1",
      "x-cache-control-max-age": String(CACHE_SECONDS),
      "x-content-type": contentType,
      "x-content-length": String(body.length),
    },
    body,
  });
  if (!res.ok) throw new Error(`upload ${pathname}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** Runs fn over items with at most `limit` in flight; results keep input order. */
export async function mapPool(items, limit, fn, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
      onProgress?.(++done, items.length);
    }
  }));
  return results;
}
