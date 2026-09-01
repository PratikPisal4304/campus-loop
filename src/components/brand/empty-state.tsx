import { ButtonLink } from "@/components/ui/button";

/**
 * The prototype had five near-identical empty states with copy that told you nothing
 * ("Nothing found"). Each of these says what happened and offers the next step.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="border-border bg-surface/60 flex flex-col items-center justify-center rounded-md border border-dashed px-8 py-16 text-center">
      <span aria-hidden="true" className="text-[34px]">
        {icon}
      </span>
      <h3 className="mt-4 text-[17px] font-bold tracking-tight">{title}</h3>
      <p className="text-fg-muted mt-2 max-w-sm text-[13px] leading-relaxed">{description}</p>
      {action && (
        <ButtonLink href={action.href} variant="accent" size="md" className="mt-6">
          {action.label} ↗
        </ButtonLink>
      )}
    </div>
  );
}
