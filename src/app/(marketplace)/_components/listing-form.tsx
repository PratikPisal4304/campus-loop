"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  priceRuleFor,
  type Category,
  type Condition,
  type ListingDetailView,
  type Mode,
} from "@/features/listings/client";
import { validateFields, validators } from "@/shared/ui/validation";
import { cn } from "@/shared/ui/cn";
import { ImageUploader } from "./image-uploader";
import { IDLE_LISTING_STATE, type ListingActionState } from "../_actions/form-state";

const MODE_OPTIONS = [
  { value: "sell", icon: "💰", label: "Sell" },
  { value: "rent", icon: "🔄", label: "Rent" },
  { value: "exchange", icon: "♻", label: "Exchange" },
  { value: "free", icon: "🆓", label: "Free" },
] as const;

type ListingAction = (
  previous: ListingActionState,
  formData: FormData,
) => Promise<ListingActionState>;

export function ListingForm({
  action,
  listing,
}: {
  /** Injected as a prop so this component never imports from a route. */
  action: ListingAction;
  listing?: ListingDetailView;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_LISTING_STATE);
  const [mode, setMode] = useState<Mode>(listing?.mode ?? "sell");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // The mode toggle drives the whole price section. The prototype rendered this toggle
  // too, but nothing read it — so a "Free" listing could carry a price.
  const priceRule = priceRuleFor(mode);
  const showPrice = priceRule === "required";

  const errorFor = (field: string) => clientErrors[field] ?? state.fieldErrors?.[field];

  const rules = {
    title: validators.listingTitle,
    description: validators.listingDescription,
    pickupArea: validators.pickupArea,
  };

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const values = {
          title: String(data.get("title") ?? ""),
          description: String(data.get("description") ?? ""),
          pickupArea: String(data.get("pickupArea") ?? ""),
        };
        const errors = validateFields(values, rules);
        if (Object.keys(errors).length > 0) {
          event.preventDefault();
          setClientErrors(errors);
        }
      }}
      className="flex flex-col gap-6"
    >
      {listing && <input type="hidden" name="listingId" value={listing.id} />}
      <input type="hidden" name="mode" value={mode} />

      <fieldset>
        <legend className="text-[12px] font-semibold">What do you want to do?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-[5px] border py-3 text-[13px] font-semibold transition-all duration-200",
                mode === option.value
                  ? "border-accent bg-[#fff0e9] text-[#bd4e25]"
                  : "border-border bg-surface hover:border-accent/40",
              )}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Item title" name="title" error={errorFor("title")}>
        <Input
          defaultValue={listing?.title}
          placeholder="e.g. TI-84 Plus CE calculator"
          onChange={() => setClientErrors((prev) => ({ ...prev, title: "" }))}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Category" name="category">
          <Select defaultValue={listing?.category ?? "books"}>
            {CATEGORIES.map((category: Category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Condition" name="condition">
          <Select defaultValue={listing?.condition ?? "good"}>
            {CONDITIONS.map((condition: Condition) => (
              <option key={condition} value={condition}>
                {CONDITION_LABELS[condition]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description" name="description" error={errorFor("description")}>
        <Textarea
          defaultValue={listing?.description}
          placeholder="Condition, what's included, best handoff times..."
          onChange={() => setClientErrors((prev) => ({ ...prev, description: "" }))}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        {showPrice ? (
          <Field
            label={mode === "rent" ? "Rental price (₹)" : "Price (₹)"}
            name="price"
            error={errorFor("price")}
            hint={mode === "rent" ? "What you charge per period." : undefined}
          >
            <Input type="number" min="0" step="1" placeholder="500" />
          </Field>
        ) : (
          <div className="flex items-end">
            <p className="rounded-sm bg-panel-sunk px-4 py-3 text-[12px] text-fg-muted">
              {mode === "free"
                ? "Free listings have no price."
                : "Exchanges have no price — say what you want in return in the description."}
            </p>
          </div>
        )}

        <Field label="Pickup area" name="pickupArea" error={errorFor("pickupArea")}>
          <Input
            defaultValue={listing?.pickupArea ?? "North Quad"}
            placeholder="North Quad"
            onChange={() => setClientErrors((prev) => ({ ...prev, pickupArea: "" }))}
          />
        </Field>
      </div>

      {mode === "rent" && (
        <Field label="Rental period" name="rentUnit" error={errorFor("rentUnit")}>
          <Select defaultValue="week">
            <option value="day">Per day</option>
            <option value="week">Per week</option>
            <option value="month">Per month</option>
          </Select>
        </Field>
      )}

      <ImageUploader initial={listing?.images} />

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger/8 px-4 py-3 text-[12px] font-medium text-danger"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" size="lg" disabled={isPending}>
        {isPending ? "Publishing…" : listing ? "Save changes ↗" : "Publish listing ↗"}
      </Button>

      {/* Switching mode adds or removes the price field. Sighted users see that happen;
          this announces it to everyone else. */}
      <p className="sr-only" aria-live="polite">
        {showPrice ? "This listing needs a price." : "This listing has no price."}
      </p>
    </form>
  );
}
