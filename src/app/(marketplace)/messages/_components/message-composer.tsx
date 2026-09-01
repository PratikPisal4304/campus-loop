"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/ui/cn";
import { sendMessageAction } from "../../_actions/messaging";
import { IDLE_MESSAGE_STATE, type MessageActionState } from "../../_actions/form-state";

/**
 * `maxLength` is a prop rather than an import: `@/features/messaging` is `server-only`,
 * so the client bundle gets the constant handed down from the page instead.
 */
export function MessageComposer({
  conversationId,
  maxLength,
  className,
}: {
  conversationId: string;
  maxLength: number;
  className?: string;
}) {
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * The clear is wrapped around the action rather than done in an effect: the action
   * returns idle only when the server accepted the message, so the draft survives a
   * failed send instead of being optimistically thrown away.
   */
  const [state, formAction, isPending] = useActionState<MessageActionState, FormData>(
    async (previous, formData) => {
      const next = await sendMessageAction(previous, formData);
      if (next.status === "idle") setBody("");
      return next;
    },
    IDLE_MESSAGE_STATE,
  );

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && body.length <= maxLength && !isPending;
  const remaining = maxLength - body.length;
  // Only worth showing once the limit is within reach; a counter that is always on just
  // makes a two-line message feel rationed.
  const showCounter = remaining <= 200;

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn("border-border mt-auto border-t p-[15px]", className)}
      onSubmit={() => textareaRef.current?.focus()}
    >
      <input type="hidden" name="conversationId" value={conversationId} />

      {state.status === "error" && (
        <p role="alert" className="text-danger mb-2 text-[11px] font-medium">
          {state.message}
        </p>
      )}

      <div className="flex items-end gap-2">
        <label htmlFor="message-body" className="sr-only">
          Write a message
        </label>
        <textarea
          id="message-body"
          name="body"
          ref={textareaRef}
          value={body}
          rows={2}
          maxLength={maxLength}
          placeholder="Write a message…"
          aria-describedby="message-body-counter"
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line. An in-progress IME composition
            // must never be hijacked into a submit.
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing)
              return;
            event.preventDefault();
            if (trimmed.length > 0 && !isPending) formRef.current?.requestSubmit();
          }}
          className="border-border bg-surface text-fg placeholder:text-fg-muted/70 focus:border-accent focus:ring-accent/15 min-h-10 w-full flex-1 resize-y rounded-sm border px-3 py-2.5 text-[12px] leading-relaxed transition-all duration-200 focus:ring-4 focus:outline-none"
        />
        <Button type="submit" variant="accent" size="md" disabled={!canSend}>
          {isPending ? "Sending…" : "Send"}
        </Button>
      </div>

      <p
        id="message-body-counter"
        aria-live="polite"
        className={cn(
          "numeral text-fg-muted mt-1.5 text-right text-[10px]",
          !showCounter && "sr-only",
          remaining <= 0 && "text-danger font-semibold",
        )}
      >
        {remaining} characters left
      </p>
    </form>
  );
}
