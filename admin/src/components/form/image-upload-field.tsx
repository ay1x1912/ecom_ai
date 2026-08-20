"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangleIcon, ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { requestUploadSignature } from "@/actions/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCEPT_ATTRIBUTE,
  describeUploadProblem,
  isPlaceholderUrl,
} from "@/lib/uploads";
import type { UploadFolder } from "@/types/api";

/**
 * An image field that can either take a pasted URL or upload a file.
 *
 * Upload is the three-step presigned handshake: sign on the server, PUT the bytes
 * straight to R2, keep the returned public URL. The URL box stays because
 * `products.image` is a plain URL column — an externally hosted image is a valid
 * value, and it is also the only way to set an image while R2_PUBLIC_BASE_URL is
 * unconfigured.
 */
export function ImageUploadField({
  name,
  label,
  folder,
  defaultValue = "",
  error,
  required,
}: {
  name: string;
  label: string;
  folder: UploadFolder;
  defaultValue?: string;
  error?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const [misconfigured, setMisconfigured] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = (file: File) => {
    const problem = describeUploadProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    startTransition(async () => {
      const result = await requestUploadSignature({
        contentType: file.type,
        size: file.size,
        folder,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const { uploadUrl, publicUrl, requiredHeaders } = result.signature;

      // The signature covers Content-Type and Content-Length, so these headers
      // must go out exactly as given or R2 refuses the PUT.
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: requiredHeaders,
        body: file,
      });

      if (!response.ok) {
        toast.error(`Upload failed (${response.status}). The signature lasts 5 minutes.`);
        return;
      }

      setValue(publicUrl);
      // The file is genuinely in the bucket at this point; it is the *public*
      // base URL that is unset, so say that rather than claiming a failure.
      setMisconfigured(isPlaceholderUrl(publicUrl));
      toast.success("Image uploaded");
    });
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>

      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border">
          {value ? (
            // Deliberately a plain <img>: the URL may be mid-typing, and the host
            // is not knowable ahead of time.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>

        <div className="grid flex-1 gap-2">
          <Input
            id={name}
            name={name}
            type="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://…"
            required={required}
            aria-invalid={error ? true : undefined}
          />

          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
                // Reset so re-picking the same file fires change again.
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
              {pending ? "Uploading…" : "Upload"}
            </Button>

            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setValue("");
                  setMisconfigured(false);
                }}
              >
                <XIcon />
                Clear
              </Button>
            ) : null}

            <span className="text-muted-foreground text-xs">
              JPEG, PNG, WebP or AVIF · 5 MB max
            </span>
          </div>
        </div>
      </div>

      {misconfigured ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-500">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          The file uploaded, but <code>R2_PUBLIC_BASE_URL</code> is still the
          placeholder in <code>.env</code>, so this URL will not load. Set it from
          the bucket&apos;s Public Development URL and re-save.
        </p>
      ) : null}

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
