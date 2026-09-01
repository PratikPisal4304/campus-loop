import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/ui/cn";

/**
 * The small mono pill. The contrast between micro-labels and huge display headings is the
 * prototype's core visual idea, but 10px is as small as it goes — a badge names the listing
 * mode, which is information the reader needs, not decoration.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-xs px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] uppercase",
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
