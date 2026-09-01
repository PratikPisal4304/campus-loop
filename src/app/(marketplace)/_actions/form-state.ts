/**
 * Shared form-state shapes for the marketplace server actions.
 *
 * These live outside the `"use server"` files on purpose: such a module may only export
 * async functions, so exporting an `IDLE_*` object from one fails the build with
 * "A 'use server' file can only export async functions, found object."
 */
export interface AccountActionState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

export const IDLE_ACCOUNT_STATE: AccountActionState = { status: "idle", message: "" };

export interface ListingActionState {
  readonly status: "idle" | "error";
  readonly message: string;
  readonly fieldErrors?: Record<string, string>;
}

export const IDLE_LISTING_STATE: ListingActionState = { status: "idle", message: "" };

export interface MessageActionState {
  readonly status: "idle" | "error";
  readonly message: string;
}

export const IDLE_MESSAGE_STATE: MessageActionState = { status: "idle", message: "" };
