import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { IntegrationError } from "@/core/domain/errors";
import { env, hasCloudinary, requireEnv } from "../env";

export interface UploadSignature {
  readonly signature: string;
  readonly timestamp: number;
  readonly apiKey: string;
  readonly cloudName: string;
  readonly folder: string;
}

/**
 * Sign a direct browser-to-Cloudinary upload.
 *
 * The bytes never touch our server: the browser posts straight to Cloudinary with this
 * signature, which keeps the API secret server-side and keeps a 5 MB photo out of the
 * server action's request body.
 */
export function signUpload(): UploadSignature {
  if (!hasCloudinary) {
    throw new IntegrationError("cloudinary", "Image uploads are not configured.");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = env.CLOUDINARY_UPLOAD_FOLDER;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    requireEnv("CLOUDINARY_API_SECRET"),
  );

  return {
    signature,
    timestamp,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    folder,
  };
}

/** Remove an asset — used when a student drops a photo before publishing. */
export async function destroyAsset(publicId: string): Promise<void> {
  if (!hasCloudinary) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  await cloudinary.uploader.destroy(publicId);
}

export { hasCloudinary };
