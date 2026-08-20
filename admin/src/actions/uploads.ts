"use server";

import { apiData, errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import type { UploadFolder, UploadSignature } from "@/types/api";

export type SignatureResult =
  | { ok: true; signature: UploadSignature }
  | { ok: false; message: string };

/**
 * Ask the API to sign one direct-to-R2 upload.
 *
 * Only the SIGNATURE is fetched here. The file bytes are then PUT from the
 * browser straight to R2 — routing them through this server action would push a
 * 5 MB body through the RSC protocol and defeat the entire point of presigning.
 *
 * The constraints below are fixed inside the signature itself, so R2 rejects a
 * mismatched upload regardless of what the browser does afterwards. The client
 * still checks them first, because a rejected PUT is a worse error message than
 * a refusal before the file leaves the machine.
 */
export async function requestUploadSignature(input: {
  contentType: string;
  size: number;
  folder: UploadFolder;
}): Promise<SignatureResult> {
  await requireAdmin();

  try {
    const signature = await apiData<UploadSignature>("/api/uploads/signature", {
      method: "POST",
      auth: true,
      body: input,
    });
    return { ok: true, signature };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
