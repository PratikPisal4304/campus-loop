import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

/**
 * The small mono pill. Sizes are deliberately tiny (8–9px) — that contrast between
 * micro-labels and huge display headings is the prototype's core visual idea.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-xs px-2 py-1 font-mono text-[8px] font-bold tracking-[0.12em] uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-panel-sunk text-fg-muted",
        rent: "bg-white text-mode-rent",
        sell: "bg-white text-mode-sell",
        free: "bg-white text-mode-free",
        exchange: "bg-white text-mode-exchange",
        accent: "bg-accent text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
