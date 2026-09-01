import { describe, expect, it, vi } from "vitest";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { participantKey, type Conversation, type Message } from "../domain/conversation";
import type {
  ConversationRepository,
  CreateConversationInput,
  CreateMessageInput,
  MessageRepository,
  TouchConversationInput,
} from "../domain/ports";
import {
  listInbox,
  openConversation,
  sendMessage,
  startConversation,
  type MessagingDeps,
} from "./messaging";

const seller = toEntityId("507f1f77bcf86cd799439011");
const buyer = toEntityId("507f1f77bcf86cd799439012");
const stranger = toEntityId("507f1f77bcf86cd799439013");
const listingId = toEntityId("507f1f77bcf86cd7994390bb");
const conversationId = toEntityId("507f1f77bcf86cd7994390aa");

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: conversationId,
    listingId,
    participantIds: participantKey(seller, buyer),
    lastMessageAt: new Date("2026-02-01T10:00:00Z"),
    lastMessagePreview: "Is this still available?",
    unread: { [seller]: 2, [buyer]: 3 },
    createdAt: new Date("2026-02-01T09:00:00Z"),
    ...overrides,
  };
}

/**
 * A hand-written pair of fakes that keep a single conversation in memory and apply the
 * same mutations the Mongo adapter would, so assertions can look at the resulting state
 * rather than at which methods happened to be called.
 */
function makeStore(initial: Conversation | null = makeConversation()) {
  const state: { conversation: Conversation | null; messages: Message[] } = {
    conversation: initial,
    messages: [],
  };

  const conversations: ConversationRepository = {
    findById: async (id: EntityId) =>
      state.conversation && state.conversation.id === id ? state.conversation : null,
    findByListingAndParticipants: async (listing, participants) => {
      const current = state.conversation;
      if (!current) return null;
      const sameListing = current.listingId === listing;
      const samePair =
        current.participantIds[0] === participants[0] &&
        current.participantIds[1] === participants[1];
      return sameListing && samePair ? current : null;
    },
    create: async (input: CreateConversationInput) => {
      const created: Conversation = {
        id: conversationId,
        listingId: input.listingId,
        participantIds: [input.participantIds[0], input.participantIds[1]],
        lastMessageAt: new Date("2026-02-01T09:00:00Z"),
        lastMessagePreview: "",
        unread: {},
        createdAt: new Date("2026-02-01T09:00:00Z"),
      };
      state.conversation = created;
      return created;
    },
    listForUser: async () => (state.conversation ? [state.conversation] : []),
    touch: async (_id: EntityId, input: TouchConversationInput) => {
      const current = state.conversation;
      if (!current) return;
      state.conversation = {
        ...current,
        lastMessagePreview: input.preview,
        lastMessageAt: input.at,
        unread: {
          ...current.unread,
          [input.incrementUnreadFor]: (current.unread[input.incrementUnreadFor] ?? 0) + 1,
        },
      };
    },
    clearUnread: async (_id: EntityId, userId: EntityId) => {
      const current = state.conversation;
      if (!current) return;
      state.conversation = { ...current, unread: { ...current.unread, [userId]: 0 } };
    },
  };

  const messages: MessageRepository = {
    listForConversation: async () => state.messages,
    create: async (input: CreateMessageInput) => {
      const created: Message = {
        id: toEntityId(`msg-${state.messages.length}`),
        conversationId: input.conversationId,
        senderId: input.senderId,
        body: input.body,
        readAt: null,
        createdAt: new Date("2026-02-01T11:00:00Z"),
      };
      state.messages.push(created);
      return created;
    },
    markRead: async () => undefined,
  };

  return { state, conversations, messages };
}

/** Straight pass-through: the transaction boundary itself is infrastructure's problem. */
const runInTransaction = <T>(work: (uow: UnitOfWork) => Promise<T>) => work({ handle: null });

function makeDeps(store = makeStore()): MessagingDeps {
  return { conversations: store.conversations, messages: store.messages, runInTransaction };
}

describe("startConversation", () => {
  it("refuses to open a thread with yourself, as a Result rather than a throw", async () => {
    const store = makeStore(null);
    const result = await startConversation(makeDeps(store), {
      listingId,
      sellerId: seller,
      buyerId: seller,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CANNOT_MESSAGE_SELF");
    expect(store.state.conversation).toBeNull();
  });

  it("reuses the existing thread instead of opening a second one", async () => {
    const store = makeStore();
    const create = vi.fn(store.conversations.create);
    const deps = makeDeps(store);
    const result = await startConversation(
      { ...deps, conversations: { ...store.conversations, create } },
      { listingId, sellerId: seller, buyerId: buyer },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe(conversationId);
    expect(create).not.toHaveBeenCalled();
  });

  it("finds that same thread when the seller is the one starting it", async () => {
    // The stored pair is sorted, so the lookup must not depend on who is the buyer.
    const store = makeStore();
    const result = await startConversation(makeDeps(store), {
      listingId,
      sellerId: buyer,
      buyerId: seller,
    });
    expect(result.ok).toBe(true);
  });

  it("creates a thread with a sorted participant pair on first contact", async () => {
    const store = makeStore(null);
    const result = await startConversation(makeDeps(store), {
      listingId,
      sellerId: buyer,
      buyerId: seller,
    });

    expect(result.ok).toBe(true);
    expect(store.state.conversation?.participantIds).toEqual(participantKey(seller, buyer));
  });
});

describe("sendMessage", () => {
  it("rejects an empty body before touching the repositories", async () => {
    const store = makeStore();
    const result = await sendMessage(makeDeps(store), {
      conversationId,
      senderId: buyer,
      body: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MESSAGE");
    expect(store.state.messages).toHaveLength(0);
  });

  it("rejects an over-length body", async () => {
    const result = await sendMessage(makeDeps(), {
      conversationId,
      senderId: buyer,
      body: "a".repeat(2001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MESSAGE");
  });

  it("refuses a non-participant with FORBIDDEN", async () => {
    const store = makeStore();
    const result = await sendMessage(makeDeps(store), {
      conversationId,
      senderId: stranger,
      body: "Hello?",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    expect(store.state.messages).toHaveLength(0);
  });

  it("bumps the preview and increments only the other participant's unread", async () => {
    const store = makeStore(makeConversation({ unread: { [seller]: 2, [buyer]: 3 } }));
    const result = await sendMessage(makeDeps(store), {
      conversationId,
      senderId: buyer,
      body: "Hi!\n\nIs the  calculator still available?",
    });

    expect(result.ok).toBe(true);
    expect(store.state.conversation?.lastMessagePreview).toBe(
      "Hi! Is the calculator still available?",
    );
    expect(store.state.conversation?.unread[seller]).toBe(3);
    // The sender has by definition read their own message.
    expect(store.state.conversation?.unread[buyer]).toBe(3);
  });

  it("writes the message and the conversation touch inside one unit of work", async () => {
    const store = makeStore();
    const handles: unknown[] = [];
    const deps: MessagingDeps = {
      conversations: {
        ...store.conversations,
        touch: async (id, input, uow) => {
          handles.push(uow?.handle);
          await store.conversations.touch(id, input, uow);
        },
      },
      messages: {
        ...store.messages,
        create: async (input, uow) => {
          handles.push(uow?.handle);
          return store.messages.create(input, uow);
        },
      },
      runInTransaction: (work) => work({ handle: "session-1" }),
    };

    await sendMessage(deps, { conversationId, senderId: buyer, body: "On my way." });
    expect(handles).toEqual(["session-1", "session-1"]);
  });
});

describe("listInbox", () => {
  it("returns views resolved from the viewer's side, not raw entities", async () => {
    const store = makeStore(makeConversation({ unread: { [seller]: 2, [buyer]: 3 } }));
    const rows = await listInbox(makeDeps(store), seller);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.otherParticipantId).toBe(buyer);
    expect(rows[0]?.unreadCount).toBe(2);
    expect(rows[0]).not.toHaveProperty("participantIds");
  });
});

describe("openConversation", () => {
  it("refuses a non-participant with FORBIDDEN", async () => {
    const store = makeStore();
    const result = await openConversation(makeDeps(store), {
      conversationId,
      userId: stranger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    // Nothing was cleared on the way out.
    expect(store.state.conversation?.unread[seller]).toBe(2);
  });

  it("clears only the reader's unread count", async () => {
    const store = makeStore(makeConversation({ unread: { [seller]: 2, [buyer]: 3 } }));
    const result = await openConversation(makeDeps(store), { conversationId, userId: seller });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.conversation.unreadCount).toBe(0);
    expect(store.state.conversation?.unread[seller]).toBe(0);
    expect(store.state.conversation?.unread[buyer]).toBe(3);
  });

  it("marks the viewer's own messages as theirs", async () => {
    const store = makeStore();
    await sendMessage(makeDeps(store), { conversationId, senderId: buyer, body: "Hello" });
    const result = await openConversation(makeDeps(store), { conversationId, userId: buyer });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(1);
      expect(result.value.messages[0]?.mine).toBe(true);
    }
  });

  it("reports a missing conversation as NOT_FOUND", async () => {
    const result = await openConversation(makeDeps(makeStore(null)), {
      conversationId,
      userId: buyer,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
