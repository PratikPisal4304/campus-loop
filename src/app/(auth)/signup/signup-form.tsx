"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/shared/ui/cn";
import {
  scorePassword,
  validateFields,
  validators,
  type FieldValidator,
} from "@/shared/ui/validation";
import { PasswordInput } from "../_components/password-input";
import type { AuthFormState } from "../_actions/auth";

const INITIAL: AuthFormState = { status: "idle", message: "" };

const RULES: Record<string, FieldValidator> = {
  name: validators.name,
  email: validators.email,
  password: validators.password,
};

/** Weak → strong. Index 0 is unused: an empty meter shows no filled bars at all. */
const BAR_TONES = ["", "bg-danger", "bg-yellow", "bg-teal", "bg-success"] as const;

export function SignupForm({
  action,
}: {
  action: (previous: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");

  const strength = scorePassword(password);
  const errorFor = (field: string) => errors[field] || state.fieldErrors?.[field];

  const validateOnBlur = (field: string) => (event: React.FocusEvent<HTMLInputElement>) => {
    const rule = RULES[field];
    setErrors((previous) => ({ ...previous, [field]: rule?.(event.target.value) ?? "" }));
  };

  const clearOnChange = (field: string) => () => {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: "" } : previous));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    const found = validateFields(values, RULES);
    if (values.confirmPassword !== values.password) {
      found.confirmPassword = "Those passwords don't match.";
    }
    if (data.get("terms") !== "on") {
      found.terms = "Accept the terms to create an account.";
    }

    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setErrors(found);
    }
  }

  const termsError = errorFor("terms");

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="border-danger/40 bg-danger/8 text-danger rounded-sm border px-3 py-2.5 text-[12px] font-medium"
        >
          {state.message}
        </p>
      )}

      <Field label="Full name" name="name" error={errorFor("name")}>
        <Input
          type="text"
          placeholder="Alex Rivera"
          autoComplete="name"
          onBlur={validateOnBlur("name")}
          onChange={clearOnChange("name")}
        />
      </Field>

      <Field label="Email address" name="email" error={errorFor("email")}>
        <Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          onBlur={validateOnBlur("email")}
          onChange={clearOnChange("email")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" name="password" error={errorFor("password")}>
          <PasswordInput
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onBlur={validateOnBlur("password")}
            onChange={(event) => {
              setPassword(event.target.value);
              clearOnChange("password")();
            }}
          />
        </Field>

        <Field label="Confirm" name="confirmPassword" error={errorFor("confirmPassword")}>
          <PasswordInput
            placeholder="••••••••"
            autoComplete="new-password"
            onBlur={(event) => {
              setErrors((previous) => ({
                ...previous,
                confirmPassword:
                  event.target.value === password ? "" : "Those passwords don't match.",
              }));
            }}
            onChange={clearOnChange("confirmPassword")}
          />
        </Field>
      </div>

      {/* The prototype drew these four bars and never wired them up. */}
      <div className="flex flex-col gap-2">
        <div aria-hidden="true" className="flex gap-1.5">
          {[1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className={cn(
                "h-1 flex-1 rounded-xs transition-colors duration-200",
                bar <= strength.score ? BAR_TONES[strength.score] : "bg-border",
              )}
            />
          ))}
        </div>
        <p aria-live="polite" className="text-fg-muted text-[11px]">
          {password ? `Password strength: ${strength.label}` : strength.label}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-fg-muted flex items-start gap-2.5 text-[12px] leading-[1.6]">
          <input
            type="checkbox"
            name="terms"
            required
            aria-invalid={termsError ? true : undefined}
            onChange={clearOnChange("terms")}
            className="border-border accent-accent mt-0.5 h-4 w-4 shrink-0 rounded-xs"
          />
          <span>
            I agree to the Campus Loop{" "}
            <Link href="/terms" className="text-accent font-semibold hover:underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent font-semibold hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {termsError && (
          <p role="alert" className="text-danger text-[11px] font-medium">
            {termsError}
          </p>
        )}
      </div>

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
        {!isPending && <span aria-hidden="true">↗</span>}
      </Button>
    </form>
  );
}
