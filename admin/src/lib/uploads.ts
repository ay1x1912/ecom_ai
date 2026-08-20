/**
 * Upload constraints, mirrored from server/src/modules/uploads/index.js.
 *
 * They are baked into the presigned URL, so breaking one means R2 rejects the
 * PUT. Checking here first turns "SignatureDoesNotMatch" into a sentence a
 * person can act on.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const ACCEPT_ATTRIBUTE = ALLOWED_UPLOAD_TYPES.join(",");

export function describeUploadProblem(file: File): string | null {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return `${file.type || "That file type"} is not allowed — use JPEG, PNG, WebP or AVIF.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `That file is ${mb} MB. The limit is 5 MB.`;
  }
  return null;
}

/** True while R2_PUBLIC_BASE_URL is still the placeholder from .env.example. */
export const isPlaceholderUrl = (url: string) => url.includes("REPLACE-ME");
