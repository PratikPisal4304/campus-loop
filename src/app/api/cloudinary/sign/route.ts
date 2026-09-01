import { NextResponse } from "next/server";
import { requireUser } from "@/features/accounts";
import { hasCloudinary, signUpload } from "@/shared/media/cloudinary";

export const dynamic = "force-dynamic";

/**
 * Hands a signed upload request to the browser so it can post the file straight to
 * Cloudinary. Gated on a signed-in student — an open signing endpoint lets anyone use
 * our storage quota as free hosting.
 */
export async function POST() {
  await requireUser();

  if (!hasCloudinary) {
    // Uploads are optional in development. The form falls back to the colour swatch.
    return NextResponse.json({ error: "Image uploads are not configured." }, { status: 503 });
  }

  return NextResponse.json(signUpload(), { headers: { "Cache-Control": "no-store" } });
}
