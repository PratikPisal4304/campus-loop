import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

/**
 * The prototype's button language: square-ish corners, a 1px border doing most of the
 * work, and a small lift on hover. `accent` is the loud orange fill — reserve it for the
 * single most-wanted action on a page, or it stops meaning anything.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        accent:
          "bg-accent text-white hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgb(168_58_12/0.28)]",
        primary:
          "bg-dark text-white hover:bg-ink hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgb(0_0_0/0.15)]",
        outline:
          "border border-border bg-transparent text-fg hover:border-accent hover:bg-accent hover:text-white hover:-translate-y-0.5",
        ghost: "bg-transparent text-fg-muted hover:bg-panel-sunk hover:text-fg",
        danger:
          "border border-danger bg-transparent text-danger hover:bg-danger hover:text-white",
      },
      size: {
        sm: "h-8 px-3 text-[12px]",
        md: "h-10 px-4 text-[13px]",
        lg: "h-[52px] px-6 text-[14px]",
        icon: "h-10 w-10",
        full: "h-9 w-full px-4 text-[12px]",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & ButtonVariants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/**
 * Same look, but it navigates. Use for links, never for actions — a real anchor keeps
 * middle-click, "open in new tab", and the browser's own affordances working.
 */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Link> & ButtonVariants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
