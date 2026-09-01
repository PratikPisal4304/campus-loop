"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { validateFields, validators } from "@/shared/ui/validation";
import { IDLE_ACCOUNT_STATE, type AccountActionState } from "../_actions/form-state";

export function ChangePasswordForm({
  action,
}: {
  action: (previous: AccountActionState, formData: FormData) => Promise<AccountActionState>;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACCOUNT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Clear the three fields once the change lands — leaving a password sitting in the DOM
    // of a page the student may walk away from is the thing this form exists to protect.
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const newPassword = String(data.get("newPassword") ?? "");
        const found = validateFields({ newPassword }, { newPassword: validators.password });
        if (String(data.get("confirmPassword") ?? "") !== newPassword) {
          found.confirmPassword = "Those passwords don't match.";
        }
        if (Object.keys(found).length > 0) {
          event.preventDefault();
          setErrors(found);
        }
      }}
      className="flex max-w-lg flex-col gap-6"
    >
      {/* Not rendered, but present: without a username field the browser's password
          manager cannot tell which account the new password belongs to. */}
      <input type="hidden" name="username" autoComplete="username" />

      <Field label="Current password" name="currentPassword">
        <Input type="password" autoComplete="current-password" onChange={() => setErrors({})} />
      </Field>

      <Field
        label="New password"
        name="newPassword"
        error={errors.newPassword}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input type="password" autoComplete="new-password" onChange={() => setErrors({})} />
      </Field>

      <Field label="Confirm new password" name="confirmPassword" error={errors.confirmPassword}>
        <Input type="password" autoComplete="new-password" onChange={() => setErrors({})} />
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

      <Button type="submit" size="lg" disabled={isPending} className="self-start">
        {isPending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
