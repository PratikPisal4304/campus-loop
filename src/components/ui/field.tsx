"use client";

import { createContext, useContext, useId } from "react";
import { cn } from "@/shared/ui/cn";

const controlStyles =
  "w-full rounded-sm border border-border bg-surface px-3 text-[13px] text-fg transition-all duration-200 placeholder:text-fg-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

const invalidStyles = "border-danger focus:border-danger focus:ring-danger/15";

interface FieldContextValue {
  readonly id: string;
  readonly name: string;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly describedBy: string;
}

/**
 * Exists only to hand the generated id down one level, from Field to its control, so
 * callers never have to invent and thread ids by hand.
 */
const FieldContext = createContext<FieldContextValue | null>(null);

function useControlProps() {
  const ctx = useContext(FieldContext);
  if (!ctx) return { props: {}, invalid: false };
  return {
    invalid: ctx.invalid,
    props: {
      id: ctx.id,
      name: ctx.name,
      required: ctx.required,
      "aria-invalid": ctx.invalid || undefined,
      "aria-describedby": ctx.describedBy || undefined,
    },
  };
}

export interface FieldProps {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: string;
  /** Fields are required by default; pass false to render the "(optional)" affordance. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + error, wired together for screen readers.
 *
 * The error is announced via `role="alert"` and bound with `aria-describedby`, and the
 * control gets `aria-invalid`. The prototype surfaced every failure through `alert()`,
 * which told assistive tech nothing and blocked the page until dismissed.
 */
export function Field({
  label,
  name,
  error,
  hint,
  required = true,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[12px] font-semibold text-fg">
        {label}
        {!required && <span className="ml-1.5 font-normal text-fg-muted">(optional)</span>}
      </label>

      <FieldContext.Provider
        value={{
          id,
          name,
          required,
          invalid: Boolean(error),
          describedBy: [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" "),
        }}
      >
        {children}
      </FieldContext.Provider>

      {hint && !error && (
        <p id={hintId} className="text-[11px] text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  const { props: fieldProps, invalid } = useControlProps();
  return (
    <input
      {...fieldProps}
      className={cn(controlStyles, "h-11", invalid && invalidStyles, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const { props: fieldProps, invalid } = useControlProps();
  return (
    <textarea
      {...fieldProps}
      className={cn(
        controlStyles,
        "min-h-28 resize-y py-2.5 leading-relaxed",
        invalid && invalidStyles,
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  const { props: fieldProps, invalid } = useControlProps();
  return (
    <select
      {...fieldProps}
      className={cn(
        controlStyles,
        "h-11 cursor-pointer appearance-none pr-9",
        invalid && invalidStyles,
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='%2377746d' d='M2 4.5h8L6 9z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "12px",
      }}
      {...props}
    >
      {children}
    </select>
  );
}
