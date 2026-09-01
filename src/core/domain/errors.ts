/**
 * Exceptional errors only. Expected business outcomes belong in `Result` (see ./result.ts) —
 * throwing is for situations a caller cannot reasonably recover from.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  /** HTTP status this maps to when it escapes to a route handler. */
  abstract readonly status: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** An invariant inside the domain was broken — indicates a bug, not bad user input. */
export class InvariantViolationError extends AppError {
  readonly code = "INVARIANT_VIOLATION";
  readonly status = 500;
}

/** A requested aggregate does not exist. */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly status = 404;

  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`);
  }
}

/** The caller is not signed in. */
export class UnauthenticatedError extends AppError {
  readonly code = "UNAUTHENTICATED";
  readonly status = 401;

  constructor(message = "You must be signed in to do that.") {
    super(message);
  }
}

/** The caller is signed in but may not touch this particular resource. */
export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor(message = "You do not have permission to do that.") {
    super(message);
  }
}

/** An upstream provider (Cloudinary) failed or misbehaved. */
export class IntegrationError extends AppError {
  readonly code = "INTEGRATION_ERROR";
  readonly status = 502;

  constructor(
    readonly provider: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`[${provider}] ${message}`, options);
  }
}

/** Config/environment is wrong — thrown at boot, never mid-request. */
export class ConfigurationError extends AppError {
  readonly code = "CONFIGURATION_ERROR";
  readonly status = 500;
}
