"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportTargetKind,
} from "@/features/moderation/client";
import { cn } from "@/shared/ui/cn";
import { IDLE_ACCOUNT_STATE } from "../_actions/form-state";
import { submitReportAction } from "../_actions/moderation";

/** What the button says it is reporting, so the copy reads right in all three places. */
const TARGET_NOUN: Record<ReportTargetKind, string> = {
  listing: "listing",
  user: "student",
  conversation: "conversation",
};

export interface ReportButtonProps {
  /** Which of the three report targets this is. Decides the copy and the column written. */
  targetKind: ReportTargetKind;
  /** The listing id, the reported student's id, or the conversation id. */
  targetId: string;
  /** Override the default "Report this listing" trigger text. */
  label?: string;
  className?: string;
}

/**
 * Report a listing, a student, or a conversation.
 *
 * Deliberately generic and self-contained: it holds its own disclosure state and posts to
 * one action, so mounting it anywhere is a single tag. It is a disclosure rather than a
 * modal because reporting is a considered act — a dialog that traps focus and dims the
 * page makes it feel like an emergency, and the surrounding context (the listing, the
 * thread) is exactly what a student wants to see while writing the note.
 */
export function ReportButton({ targetKind, targetId, label, className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const noun = TARGET_NOUN[targetKind];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-fg-muted hover:text-danger text-[12px] font-semibold underline-offset-4 transition-colors hover:underline",
          className,
        )}
      >
        {label ?? `Report this ${noun}`}
      </button>
    );
  }

  // Remounted on every open, which is also how the submitted state is reset: `useActionState`
  // has no reset, and reopening a form that still remembers the last send would show a
  // stale confirmation over an empty form.
  return (
    <ReportForm
      targetKind={targetKind}
      targetId={targetId}
      noun={noun}
      onClose={() => setOpen(false)}
      className={className}
    />
  );
}

function ReportForm({
  targetKind,
  targetId,
  noun,
  onClose,
  className,
}: {
  targetKind: ReportTargetKind;
  targetId: string;
  noun: string;
  onClose: () => void;
  className?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitReportAction, IDLE_ACCOUNT_STATE);
  const panel = cn("border-border bg-surface rounded-md border p-4", className);

  if (state.status === "success") {
    return (
      <div className={cn(panel, "flex flex-col items-start gap-3")}>
        <p role="status" className="text-fg text-[13px] font-semibold">
          {state.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted hover:text-fg text-[12px] font-semibold"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={cn(panel, "flex flex-col gap-4")}>
      <input type="hidden" name="targetKind" value={targetKind} />
      <input type="hidden" name="targetId" value={targetId} />

      <p className="text-fg text-[13px] font-semibold">Report this {noun}</p>

      <Field label="What's wrong?" name="reason">
        <Select defaultValue="scam">
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REPORT_REASON_LABELS[reason]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Anything else we should know?"
        name="details"
        required={false}
        hint="Only moderators see this."
      >
        <Textarea
          maxLength={MAX_REPORT_DETAILS_LENGTH}
          placeholder="What happened, and when."
          className="min-h-20"
        />
      </Field>

      {state.status === "error" && (
        <p
          role="alert"
          className="border-danger/30 bg-danger/8 text-danger rounded-sm border px-3 py-2 text-[12px] font-medium"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={isPending}>
          {isPending ? "Sending…" : "Send report"}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted hover:text-fg px-2 text-[12px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
