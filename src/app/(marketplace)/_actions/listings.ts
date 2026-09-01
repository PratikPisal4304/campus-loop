"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { toEntityId } from "@/core/types/branded";
import { requireUser } from "@/features/accounts";
import {
  CATEGORIES,
  CONDITIONS,
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
  url: z.url(),
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
    price: z.string().trim().optional(),
    rentUnit: z.string().trim().optional(),
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

    if (value.mode === "rent" && !RENT_UNITS.includes(value.rentUnit as never)) {
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

const toPaise = (rupees: string | undefined) =>
  rupees && Number(rupees) > 0 ? Math.round(Number(rupees) * 100) : null;

export async function createListingAction(
  _previous: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await requireUser();

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
    rentUnit: rest.mode === "rent" ? (rentUnit as "day" | "week" | "month") : null,
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
  const user = await requireUser();
  const listingId = String(formData.get("listingId") ?? "");

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
    rentUnit: rest.mode === "rent" ? (rentUnit as "day" | "week" | "month") : null,
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
  const user = await requireUser();
  await closeListing(user.id, toEntityId(String(formData.get("listingId") ?? "")));
  revalidatePath("/");
  revalidatePath("/loop");
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await deleteListing(user.id, toEntityId(String(formData.get("listingId") ?? "")));
  revalidatePath("/");
  revalidatePath("/loop");
  revalidatePath("/saved");
  redirect("/loop");
}

/** Returns the new saved state so the button can re-render without a round trip. */
export async function toggleSavedAction(listingId: string): Promise<boolean> {
  const user = await requireUser();
  const saved = await toggleSaved(user.id, toEntityId(listingId));
  revalidatePath("/saved");
  return saved;
}
