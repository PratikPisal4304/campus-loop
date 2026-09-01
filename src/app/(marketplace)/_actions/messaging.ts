"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isEntityId, toEntityId } from "@/core/types/branded";
import { requireUserOrRedirect } from "@/features/accounts";
import { MAX_MESSAGE_LENGTH, sendMessage, startConversation } from "@/features/messaging";
import { IDLE_MESSAGE_STATE, type MessageActionState } from "./form-state";

const sendSchema = z.object({
  conversationId: z.string().trim().min(1, "That conversation no longer exists."),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(MAX_MESSAGE_LENGTH, "That message is too long."),
});

export async function sendMessageAction(
  _previous: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  // The proxy gates navigation, not direct action invocations — so the guard lives here,
  // at the only place that actually protects the write.
  const user = await requireUserOrRedirect();

  const parsed = sendSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That message couldn't be sent.",
    };
  }

  const result = await sendMessage({
    conversationId: toEntityId(parsed.data.conversationId),
    senderId: user.id,
    body: parsed.data.body,
  });

  if (!result.ok) return { status: "error", message: result.error.message };

  // The thread route is dynamic, so it is revalidated by its route pattern rather than by
  // a concrete href; the inbox needs it too, for the preview and the unread badge.
  revalidatePath("/messages/[conversationId]", "page");
  revalidatePath("/messages");
  // The unread badge is rendered by the marketplace layout, on every page in the app.
  // Without this the recipient's badge stays as stale as their last navigation.
  revalidatePath("/", "layout");

  return IDLE_MESSAGE_STATE;
}

const startSchema = z.object({
  listingId: z.string().trim().refine(isEntityId, "Invalid listing."),
  slug: z.string().trim().optional(),
});

export async function startConversationAction(formData: FormData): Promise<void> {
  const user = await requireUserOrRedirect();

  const parsed = startSchema.safeParse({
    listingId: formData.get("listingId"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) redirect("/");

  // No sellerId: the use case reads it from the listing itself.
  const result = await startConversation({
    listingId: toEntityId(parsed.data.listingId),
    buyerId: user.id,
  });

  // `redirect()` throws a control-flow signal, so every branch below is deliberately
  // outside any try/catch — a catch here would swallow the navigation.
  if (!result.ok) {
    const slug = parsed.data.slug;
    const back = slug ? `/listings/${slug}` : "/";
    redirect(`${back}?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath("/messages");
  revalidatePath("/", "layout");
  redirect(`/messages/${result.value.id}`);
}
