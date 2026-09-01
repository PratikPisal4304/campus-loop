import { toast } from "sonner";

/**
 * The only sanctioned way to raise a toast.
 *
 * Call sites import from here rather than from `sonner` directly, so swapping the toast
 * library later is a one-file change instead of a codemod across the app.
 */
export function toastSuccess(message: string): void {
  toast.success(message);
}

export function toastError(message: string): void {
  toast.error(message);
}
