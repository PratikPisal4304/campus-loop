import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * Plain `clsx` would leave `"px-4 px-6"` in the DOM and let CSS source order decide;
 * `twMerge` resolves it to `px-6`, which is what a caller passing a className expects.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
