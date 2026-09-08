"use client";
import { useActionState } from "react";
import { Button } from "./button";

export interface FormFeedback {
  error?: string;
  success?: string;
}
export function ActionForm({
  action,
  children,
  label,
  className = "",
}: {
  action: (data: FormData) => Promise<FormFeedback>;
  children?: React.ReactNode;
  label: string;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: FormFeedback, data: FormData) => {
      try {
        return await action(data);
      } catch {
        return { error: "Something went wrong. Refresh and try again." };
      }
    },
    {},
  );
  return (
    <form action={submit} className={`space-y-3 ${className}`}>
      <fieldset disabled={pending} className="space-y-3">
        {children}
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : label}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-success text-sm">
          {state.success}
        </p>
      )}
    </form>
  );
}
