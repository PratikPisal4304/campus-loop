"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IDLE_ACCOUNT_STATE, type AccountActionState } from "../_actions/form-state";

/**
 * Deleting an account is irreversible and takes everything with it, so the form is not on
 * screen until asked for, and then costs a password and a typed word. A single red button
 * next to "Save changes" is a mis-click away from a cascade nobody can undo.
 */
export function DeleteAccountForm({
  action,
}: {
  action: (previous: AccountActionState, formData: FormData) => Promise<AccountActionState>;
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACCOUNT_STATE);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="danger"
        size="md"
        onClick={() => setOpen(true)}
        className="mt-5"
      >
        Delete my account
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-danger/40 mt-5 flex flex-col gap-5 rounded-md border p-5"
    >
      <p className="text-fg text-[13px] leading-relaxed">
        This removes your listings, saved items, conversations and reviews. It cannot be undone.
      </p>

      <Field label="Your password" name="password">
        <Input type="password" autoComplete="current-password" />
      </Field>

      <Field label="Type DELETE to confirm" name="confirmation">
        <Input autoComplete="off" spellCheck={false} placeholder="DELETE" />
      </Field>

      {state.status === "error" && (
        <p
          role="alert"
          className="border-danger/30 bg-danger/8 text-danger rounded-sm border px-3 py-2 text-[12px] font-medium"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="danger" size="md" disabled={isPending}>
          {isPending ? "Deleting…" : "Permanently delete"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-fg-muted hover:text-fg px-2 text-[12px]"
        >
          Keep my account
        </button>
      </div>
    </form>
  );
}
