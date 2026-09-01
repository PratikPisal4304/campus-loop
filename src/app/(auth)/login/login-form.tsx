"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { validateFields, validators, type FieldValidator } from "@/shared/ui/validation";
import { PasswordInput } from "../_components/password-input";
import type { AuthFormState } from "../_actions/auth";

const INITIAL: AuthFormState = { status: "idle", message: "" };

/** Sign-in only checks that a password was typed — the server decides whether it matches. */
const RULES: Record<string, FieldValidator> = {
  email: validators.email,
  password: validators.required("Password"),
};

export function LoginForm({
  action,
  next,
}: {
  action: (previous: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next: string;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const errorFor = (field: string) => errors[field] || state.fieldErrors?.[field];

  const validateOnBlur = (field: string) => (event: React.FocusEvent<HTMLInputElement>) => {
    const rule = RULES[field];
    setErrors((previous) => ({ ...previous, [field]: rule?.(event.target.value) ?? "" }));
  };

  // Typing is the user fixing the problem; keep the message out of the way until they stop.
  const clearOnChange = (field: string) => () => {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: "" } : previous));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const found = validateFields(
      {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      },
      RULES,
    );

    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setErrors(found);
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="border-danger/40 bg-danger/8 text-danger rounded-sm border px-3 py-2.5 text-[12px] font-medium"
        >
          {state.message}
        </p>
      )}

      <Field label="Email address" name="email" error={errorFor("email")}>
        <Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          onBlur={validateOnBlur("email")}
          onChange={clearOnChange("email")}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Field label="Password" name="password" error={errorFor("password")}>
          <PasswordInput
            placeholder="Enter your password"
            autoComplete="current-password"
            onBlur={validateOnBlur("password")}
            onChange={clearOnChange("password")}
          />
        </Field>
        <Link
          href="/forgot-password"
          className="text-accent self-end text-[11px] font-semibold hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Logging in…" : "Log in"}
        {!isPending && <span aria-hidden="true">↗</span>}
      </Button>
    </form>
  );
}
