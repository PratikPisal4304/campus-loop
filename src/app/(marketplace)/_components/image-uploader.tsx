"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

const MAX_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads photos straight from the browser to Cloudinary using a server-signed request,
 * so the API secret stays server-side and a 5 MB file never travels through a server
 * action's request body.
 *
 * The chosen images are serialised into a hidden input, which is what the server action
 * parses — that keeps the whole form a single plain POST.
 */
export function ImageUploader({ initial = [] }: { initial?: readonly UploadedImage[] }) {
  const [images, setImages] = useState<UploadedImage[]>([...initial]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    setError(null);

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    const chosen = Array.from(files).slice(0, room);
    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type)) {
        setError("Photos must be JPG, PNG or WebP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" is over 5MB.`);
        return;
      }
    }

    setUploading(true);
    try {
      const signed = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (!signed.ok) {
        setError(
          signed.status === 503
            ? "Photo uploads aren't set up yet — your listing will use a colour tile instead."
            : "Couldn't start the upload. Try again.",
        );
        return;
      }

      const { signature, timestamp, apiKey, cloudName, folder } = await signed.json();

      const uploaded: UploadedImage[] = [];
      for (const file of chosen) {
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", apiKey);
        body.append("timestamp", String(timestamp));
        body.append("signature", signature);
        body.append("folder", folder);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body },
        );
        if (!response.ok) {
          setError("One of the photos failed to upload.");
          break;
        }
        const result = await response.json();
        uploaded.push({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width ?? 0,
          height: result.height ?? 0,
        });
      }

      setImages((current) => [...current, ...uploaded]);
    } catch {
      setError("Couldn't reach the image service.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold">
        Add photos <span className="text-fg-muted ml-1.5 font-normal">(optional)</span>
      </span>

      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {images.length > 0 && (
        <ul className="mb-2 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {images.map((image) => (
            <li key={image.publicId} className="relative">
              <div className="border-border relative h-20 overflow-hidden rounded-sm border">
                <Image src={image.url} alt="" fill sizes="20vw" className="object-cover" />
              </div>
              <button
                type="button"
                onClick={() =>
                  setImages((current) => current.filter((i) => i.publicId !== image.publicId))
                }
                aria-label="Remove this photo"
                className="bg-dark absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {images.length < MAX_IMAGES && (
        <label className="border-border bg-surface hover:border-accent flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[5px] border border-dashed px-4 py-7 text-center transition-colors">
          <span aria-hidden="true" className="text-[18px]">
            ＋
          </span>
          <strong className="text-[12px]">{isUploading ? "Uploading…" : "Add photos"}</strong>
          <small className="text-fg-muted text-[10px]">JPG, PNG or WebP up to 5MB</small>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            disabled={isUploading}
            onChange={(event) => {
              if (event.target.files?.length) void upload(event.target.files);
            }}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="text-danger text-[11px] font-medium">
          {error}
        </p>
      )}

      <p className="text-fg-muted text-[11px]">
        No photo? Your listing gets a colour tile — that&apos;s fine, but photos get replies
        faster.
      </p>
    </div>
  );
}
