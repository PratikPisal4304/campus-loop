"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { ProfileView } from "@/features/accounts";
import { validateFields, validators } from "@/shared/ui/validation";
import { IDLE_ACCOUNT_STATE, type AccountActionState } from "../_actions/form-state";

export function SettingsForm({
  action,
  profile,
}: {
  action: (previous: AccountActionState, formData: FormData) => Promise<AccountActionState>;
  profile: ProfileView;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACCOUNT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const found = validateFields(
          { name: String(data.get("name") ?? "") },
          {
            name: validators.name,
          },
        );
        if (Object.keys(found).length > 0) {
          event.preventDefault();
          setErrors(found);
        }
      }}
      className="flex max-w-lg flex-col gap-6"
    >
      <Field label="Full name" name="name" error={errors.name}>
        <Input defaultValue={profile.name} autoComplete="name" onChange={() => setErrors({})} />
      </Field>

      <Field
        label="Bio"
        name="bio"
        required={false}
        hint="A line about what you study — it shows on your profile."
      >
        <Textarea
          defaultValue={profile.bio ?? ""}
          maxLength={280}
          placeholder="Third-year mechanical engineering. Mostly selling lab gear."
        />
      </Field>

      <Field
        label="Usual campus area"
        name="campusArea"
        required={false}
        hint="Where you normally hand things over."
      >
        <Input defaultValue={profile.campusArea ?? ""} placeholder="North Quad" />
      </Field>

      {state.status !== "idle" && (
        <p
          role="alert"
          className={
            state.status === "error"
              ? "border-danger/30 bg-danger/8 text-danger rounded-sm border px-4 py-3 text-[12px] font-medium"
              : "border-success/30 bg-success/8 text-success rounded-sm border px-4 py-3 text-[12px] font-medium"
          }
        >
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={isPending}
        className="self-start"
      >
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
