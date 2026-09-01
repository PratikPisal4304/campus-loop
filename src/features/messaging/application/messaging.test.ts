import { describe, expect, it, vi } from "vitest";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { toEntityId, type EntityId } from "@/core/types/branded";
import { participantKey, type Conversation, type Message } from "../domain/conversation";
import type {
  ConversationRepository,
  CreateConversationInput,
  CreateMessageInput,
  InboxDirectory,
  ListConversationsOptions,
  MessageRepository,
  TouchConversationInput,
} from "../domain/ports";
import {
  countUnread,
  getConversationHeader,
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

/** The slice a real repository would return: newest first, cursor-filtered, then capped. */
function page(
  conversations: readonly Conversation[],
  userId: EntityId,
  options: ListConversationsOptions = {},
): readonly Conversation[] {
  return conversations
    .filter((conversation) => conversation.participantIds.includes(userId))
    .filter((conversation) =>
      options.before ? conversation.lastMessageAt < options.before : true,
    )
    .toSorted((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .slice(0, options.limit ?? conversations.length);
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
    listForUser: async (userId: EntityId, options?: ListConversationsOptions) =>
      page(state.conversation ? [state.conversation] : [], userId, options),
    sumUnread: async (userId: EntityId) => state.conversation?.unread[userId] ?? 0,
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

/**
 * Names every id it is handed, and counts its calls — the point of the batch port is that
 * an inbox of many rows still resolves in exactly two lookups.
 */
function makeDirectory() {
  const calls = { participants: 0, listings: 0 };
  const directory: InboxDirectory = {
    participantsByIds: async (ids) => {
      calls.participants += 1;
      return ids.map((id) => ({ id, name: `Student ${id.slice(-2)}`, initials: "ST" }));
    },
    listingsByIds: async (ids) => {
      calls.listings += 1;
      return ids.map((id) => ({ id, title: `Listing ${id.slice(-2)}`, slug: `listing-${id}` }));
    },
  };
  return { calls, directory };
}

/** The listing lookup the use case consults for the authoritative seller. */
function makeDeps(
  store = makeStore(),
  sellerIdFor = async () => seller as EntityId | null,
  directory: InboxDirectory = makeDirectory().directory,
) {
  return {
    conversations: store.conversations,
    messages: store.messages,
    listings: { sellerIdFor },
    directory,
    runInTransaction,
  } satisfies MessagingDeps;
}

describe("startConversation", () => {
  it("refuses to open a thread with yourself, as a Result rather than a throw", async () => {
    const store = makeStore(null);
    const result = await startConversation(makeDeps(store), {
      listingId,
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
      { listingId, buyerId: buyer },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe(conversationId);
    expect(create).not.toHaveBeenCalled();
  });

  it("finds that same thread when the seller is the one starting it", async () => {
    // The stored pair is sorted, so the lookup must not depend on who is the buyer.
    const store = makeStore();
    // The listing belongs to `buyer` this time, so `seller` is the one making contact.
    const result = await startConversation(
      makeDeps(store, async () => buyer),
      {
        listingId,
        buyerId: seller,
      },
    );
    expect(result.ok).toBe(true);
  });

  it("takes the seller from the listing, so a forged recipient cannot be injected", async () => {
    // Regression: `sellerId` used to arrive as a hidden form field. Anyone could POST an
    // arbitrary user id and open a thread with any student on the platform, labelled with
    // a listing neither of them owned. The input no longer carries a seller at all, and
    // this asserts the pair is built from the listing's real owner.
    const store = makeStore(null);
    const victim = toEntityId("victimuser000000000000");
    const sellerIdFor = vi.fn(async () => seller as EntityId | null);

    const result = await startConversation(makeDeps(store, sellerIdFor), {
      listingId,
      buyerId: buyer,
    });

    expect(result.ok).toBe(true);
    expect(sellerIdFor).toHaveBeenCalledWith(listingId);
    expect(store.state.conversation?.participantIds).toEqual(participantKey(seller, buyer));
    expect(store.state.conversation?.participantIds).not.toContain(victim);
  });

  it("refuses a listing that does not exist rather than opening an orphan thread", async () => {
    const store = makeStore(null);
    const result = await startConversation(
      makeDeps(store, async () => null),
      {
        listingId,
        buyerId: buyer,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LISTING_NOT_FOUND");
    expect(store.state.conversation).toBeNull();
  });

  it("creates a thread with a sorted participant pair on first contact", async () => {
    const store = makeStore(null);
    const result = await startConversation(
      makeDeps(store, async () => buyer),
      {
        listingId,
        buyerId: seller,
      },
    );

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
      listings: { sellerIdFor: async () => seller },
      directory: makeDirectory().directory,
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
    const { rows } = await listInbox(makeDeps(store), seller);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.otherParticipantId).toBe(buyer);
    expect(rows[0]?.unreadCount).toBe(2);
    expect(rows[0]).not.toHaveProperty("participantIds");
  });

  it("labels rows from the directory, falling back for a deleted account or listing", async () => {
    const store = makeStore();
    const empty: InboxDirectory = {
      participantsByIds: async () => [],
      listingsByIds: async () => [],
    };

    const named = await listInbox(makeDeps(store), seller);
    expect(named.rows[0]?.otherName).toBe(`Student ${buyer.slice(-2)}`);
    expect(named.rows[0]?.listingSlug).toBe(`listing-${listingId}`);

    const missing = await listInbox(makeDeps(store, undefined, empty), seller);
    expect(missing.rows[0]?.otherName).toBe("Former student");
    expect(missing.rows[0]?.listingTitle).toBe("Listing removed");
    // A null slug is what tells the route not to link a listing that is gone.
    expect(missing.rows[0]?.listingSlug).toBeNull();
  });

  it("caps the page and hands back a cursor, without over-reporting the extra row", async () => {
    // Regression: the inbox used to load every conversation a student had ever had.
    const conversations = Array.from({ length: 5 }, (_, index) =>
      makeConversation({
        id: toEntityId(`conversation-${index}`),
        lastMessageAt: new Date(Date.UTC(2026, 1, 1, 10 + index)),
      }),
    );
    const store = makeStore();
    const listForUser = vi.fn(async (userId: EntityId, options?: ListConversationsOptions) =>
      page(conversations, userId, options),
    );
    const deps = { ...makeDeps(store), conversations: { ...store.conversations, listForUser } };

    const first = await listInbox(deps, seller, { limit: 2 });
    expect(first.rows).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    // Asks for one more than it shows, so "is there more?" costs no extra query.
    expect(listForUser).toHaveBeenCalledWith(seller, { limit: 3 });
    expect(first.nextCursor).toEqual(new Date(Date.UTC(2026, 1, 1, 13)));

    const last = await listInbox(deps, seller, {
      limit: 2,
      before: new Date(Date.UTC(2026, 1, 1, 11)),
    });
    expect(last.rows).toHaveLength(1);
    expect(last.hasMore).toBe(false);
    expect(last.nextCursor).toBeNull();
  });

  it("resolves the whole page in two directory calls, not two per row", async () => {
    const conversations = Array.from({ length: 4 }, (_, index) =>
      makeConversation({
        id: toEntityId(`conversation-${index}`),
        lastMessageAt: new Date(Date.UTC(2026, 1, 1, 10 + index)),
      }),
    );
    const store = makeStore();
    const { calls, directory } = makeDirectory();
    const deps = {
      ...makeDeps(store, undefined, directory),
      conversations: {
        ...store.conversations,
        listForUser: async (userId: EntityId, options?: ListConversationsOptions) =>
          page(conversations, userId, options),
      },
    };

    const inbox = await listInbox(deps, seller);
    expect(inbox.rows).toHaveLength(4);
    expect(calls).toEqual({ participants: 1, listings: 1 });
  });

  it("skips the directory entirely for an empty inbox", async () => {
    const { calls, directory } = makeDirectory();
    const inbox = await listInbox(makeDeps(makeStore(null), undefined, directory), seller);

    expect(inbox.rows).toEqual([]);
    expect(inbox.hasMore).toBe(false);
    expect(calls).toEqual({ participants: 0, listings: 0 });
  });
});

describe("countUnread", () => {
  it("comes from the aggregate, not from summing a loaded inbox", async () => {
    const store = makeStore(makeConversation({ unread: { [seller]: 7, [buyer]: 3 } }));
    const listForUser = vi.fn(store.conversations.listForUser);
    const deps = { ...makeDeps(store), conversations: { ...store.conversations, listForUser } };

    expect(await countUnread(deps, seller)).toBe(7);
    // The badge renders on every page in the app; it must not scan conversations to do it.
    expect(listForUser).not.toHaveBeenCalled();
  });
});

describe("getConversationHeader", () => {
  it("resolves the other student's name without marking the thread read", async () => {
    const store = makeStore(makeConversation({ unread: { [seller]: 2, [buyer]: 3 } }));
    const result = await getConversationHeader(makeDeps(store), {
      conversationId,
      userId: seller,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.otherName).toBe(`Student ${buyer.slice(-2)}`);
    // `generateMetadata` runs alongside the page render — it must not clear the badge too.
    expect(store.state.conversation?.unread[seller]).toBe(2);
  });

  it("refuses a non-participant with FORBIDDEN", async () => {
    const result = await getConversationHeader(makeDeps(), {
      conversationId,
      userId: stranger,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
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
