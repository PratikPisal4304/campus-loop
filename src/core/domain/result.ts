/**
 * Result — explicit success/failure for *expected* outcomes.
 *
 * Use cases return `Result` instead of throwing when the failure is part of the business
 * flow (the listing is already closed, you are not a participant in this conversation,
 * that email is taken). Exceptions stay reserved for genuinely exceptional situations —
 * a dropped database connection, a misconfigured secret — where the caller has nothing
 * sensible to do anyway.
 *
 * Because it is a discriminated union, TypeScript forces callers to handle both arms.
 */
export type Result<T, E = DomainFailure> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface DomainFailure {
  /** Stable, machine-readable code — safe to switch on and to map to an HTTP status. */
  readonly code: string;
  /** Human-readable message, safe to show the student. */
  readonly message: string;
  /** Optional field-level detail, keyed by form field name. */
  readonly details?: Record<string, string>;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = DomainFailure>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function fail(
  code: string,
  message: string,
  details?: Record<string, string>,
): Result<never, DomainFailure> {
  return { ok: false, error: details ? { code, message, details } : { code, message } };
}

export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/** Map the success value, passing failures through untouched. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Unwrap or throw — only for call sites that have already proven success. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`Called unwrap() on a failed Result: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}
