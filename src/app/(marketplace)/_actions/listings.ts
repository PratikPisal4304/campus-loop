"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isEntityId, toEntityId } from "@/core/types/branded";
import { requireUserOrRedirect } from "@/features/accounts";
import { isAllowedImageUrl } from "@/shared/media/image-source";
import {
  CATEGORIES,
  CONDITIONS,
  MAX_PRICE_RUPEES,
  MODES,
  RENT_UNITS,
  closeListing,
  createListing,
  deleteListing,
  priceRuleFor,
  toggleSaved,
  updateListing,
} from "@/features/listings";
import type { ListingActionState } from "./form-state";

const imageSchema = z.object({
  publicId: z.string().min(1),
  // Pinned to the delivery origin. A bare z.url() accepts any host — and next/image
  // throws on an unconfigured one, which turns a single listing into an outage.
  url: z.url().refine(isAllowedImageUrl, "Images must be served from Cloudinary."),
  width: z.coerce.number().int().min(0).default(0),
  height: z.coerce.number().int().min(0).default(0),
});

/**
 * The form posts `price` in rupees because that is what a person types. It is converted
 * to integer paise here, at the boundary, and never handled as a float again.
 */
const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "That title is too short.")
      .max(100, "Keep the title under 100 characters."),
    description: z
      .string()
      .trim()
      .min(10, "Add a bit more detail — condition, what's included.")
      .max(2000, "That description is too long."),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    mode: z.enum(MODES),
    // Bounded so a huge number cannot overflow the Int column and 500 the request.
    price: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
        "Enter a price as a number.",
      )
      .refine(
        (value) => !value || Number(value) <= MAX_PRICE_RUPEES,
        `Keep the price under ₹${MAX_PRICE_RUPEES.toLocaleString("en-IN")}.`,
      ),
    rentUnit: z.enum(RENT_UNITS).optional(),
    pickupArea: z
      .string()
      .trim()
      .min(2, "Name a pickup spot on campus.")
      .max(60, "Keep the pickup area short."),
    images: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const rule = priceRuleFor(value.mode);
    const hasPrice = Boolean(value.price && Number(value.price) > 0);

    if (rule === "required" && !hasPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message:
          value.mode === "rent"
            ? "Set the rental price you want per period."
            : "Set a price, or switch to Free if you're giving it away.",
      });
    }

    if (rule === "forbidden" && hasPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message:
          value.mode === "free"
            ? "A free item can't have a price. Switch to Sell if you want to charge for it."
            : "An exchange has no price. Describe what you want in return instead.",
      });
    }

    if (value.mode === "rent" && !value.rentUnit) {
      ctx.addIssue({
        code: "custom",
        path: ["rentUnit"],
        message: "Say whether that's per day, week or month.",
      });
    }
  });

/**
 * `formData.get()` returns `null` for a field the form did not render, and Zod's
 * `.optional()` accepts `undefined` but rejects `null`. The rental period only exists in
 * the DOM when the mode is "rent", so without this every sale would fail validation on a
 * field the student was never shown.
 */
function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function parseListingForm(formData: FormData) {
  return listingSchema.safeParse({
    title: field(formData, "title"),
    description: field(formData, "description"),
    category: field(formData, "category"),
    condition: field(formData, "condition"),
    mode: field(formData, "mode"),
    price: field(formData, "price"),
    rentUnit: field(formData, "rentUnit"),
    pickupArea: field(formData, "pickupArea"),
    images: field(formData, "images"),
  });
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

function parseImages(raw: string | undefined): z.infer<typeof imageSchema>[] {
  if (!raw) return [];
  try {
    const parsed = z.array(imageSchema).max(5).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    // A malformed images payload should cost the student their photos, not their listing.
    return [];
  }
}

/**
 * Ids arrive from hidden form fields, so they are user input like anything else. Without
 * this, a malformed value reaches Prisma and a foreign-key violation surfaces as a 500.
 */
const idSchema = z.string().trim().refine(isEntityId, "That listing no longer exists.");

function parseId(formData: FormData, name: string): string | null {
  const parsed = idSchema.safeParse(formData.get(name));
  return parsed.success ? parsed.data : null;
}

const toPaise = (rupees: string | undefined) =>
  rupees && Number(rupees) > 0 ? Math.round(Number(rupees) * 100) : null;

export async function createListingAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await requireUserOrRedirect();

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { price, rentUnit, images, ...rest } = parsed.data;
  const result = await createListing(user.id, {
    ...rest,
    pricePaise: toPaise(price),
    rentUnit: rest.mode === "rent" ? (rentUnit ?? null) : null,
    images: parseImages(images),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      ...(result.error.details ? { fieldErrors: result.error.details } : {}),
    };
  }

  revalidatePath("/");
  revalidatePath("/loop");
  redirect(`/listings/${result.value.slug}`);
}

export async function updateListingAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await requireUserOrRedirect();
  const listingId = parseId(formData, "listingId");
  if (!listingId) {
    return { status: "error", message: "That listing no longer exists." };
  }

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { price, rentUnit, images, ...rest } = parsed.data;
  const result = await updateListing(user.id, toEntityId(listingId), {
    ...rest,
    pricePaise: toPaise(price),
    rentUnit: rest.mode === "rent" ? (rentUnit ?? null) : null,
    images: parseImages(images),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      ...(result.error.details ? { fieldErrors: result.error.details } : {}),
    };
  }

  revalidatePath("/");
  revalidatePath("/loop");
  revalidatePath(`/listings/${result.value.slug}`);
  redirect(`/listings/${result.value.slug}`);
}

export async function closeListingAction(formData: FormData): Promise<void> {
  const user = await requireUserOrRedirect();
  const listingId = parseId(formData, "listingId");
  if (!listingId) return;

  await closeListing(user.id, toEntityId(listingId));
  revalidatePath("/");
  revalidatePath("/loop");
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await requireUserOrRedirect();
  const listingId = parseId(formData, "listingId");
  if (!listingId) return;

  await deleteListing(user.id, toEntityId(listingId));
  revalidatePath("/");
  revalidatePath("/loop");
  revalidatePath("/saved");
  redirect("/loop");
}

/** Returns the new saved state so the button can re-render without a round trip. */
export async function toggleSavedAction(listingId: string): Promise<boolean> {
  const user = await requireUserOrRedirect();
  if (!isEntityId(listingId)) {
    // Previously this reached Prisma and raised a foreign-key error the client silently
    // swallowed, so the heart just stopped working with no explanation.
    throw new Error("Invalid listing id.");
  }

  const saved = await toggleSaved(user.id, toEntityId(listingId));
  revalidatePath("/saved");
  return saved;
}
