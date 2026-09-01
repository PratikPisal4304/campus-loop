import { describe, expect, it } from "vitest";
import { toEntityId } from "@/core/types/branded";
import {
  canMessage,
  conversationKey,
  isParticipant,
  MAX_MESSAGE_LENGTH,
  otherParticipant,
  participantKey,
  previewOf,
  validateMessageBody,
  type Conversation,
} from "./conversation";

const seller = toEntityId("507f1f77bcf86cd799439011");
const buyer = toEntityId("507f1f77bcf86cd799439012");
const stranger = toEntityId("507f1f77bcf86cd799439013");

const thread: Conversation = {
  id: toEntityId("507f1f77bcf86cd7994390aa"),
  listingId: toEntityId("507f1f77bcf86cd7994390bb"),
  participantIds: participantKey(seller, buyer),
  lastMessageAt: new Date("2026-02-01T10:00:00Z"),
  lastMessagePreview: "Is this still available?",
  unread: { [seller]: 1 },
  createdAt: new Date("2026-02-01T09:00:00Z"),
};

describe("canMessage", () => {
  it("refuses a conversation with yourself about your own listing", () => {
    expect(canMessage(seller, seller)).toBe(false);
  });

  it("allows two different students", () => {
    expect(canMessage(seller, buyer)).toBe(true);
  });
});

describe("participantKey", () => {
  it("gives the same key regardless of argument order", () => {
    expect(participantKey(seller, buyer)).toEqual(participantKey(buyer, seller));
  });

  it("sorts the pair, so the stored array is a stable unique key", () => {
    expect(participantKey(buyer, seller)).toEqual([seller, buyer]);
  });
});

describe("isParticipant / otherParticipant", () => {
  it("recognises both members and rejects everyone else", () => {
    expect(isParticipant(thread, seller)).toBe(true);
    expect(isParticipant(thread, buyer)).toBe(true);
    expect(isParticipant(thread, stranger)).toBe(false);
  });

  it("resolves the person on the other end", () => {
    expect(otherParticipant(thread, seller)).toBe(buyer);
    expect(otherParticipant(thread, buyer)).toBe(seller);
  });

  it("returns null for someone who is not in the thread", () => {
    expect(otherParticipant(thread, stranger)).toBeNull();
  });
});

describe("validateMessageBody", () => {
  it("rejects an empty body", () => {
    expect(validateMessageBody("")).toBe("Write a message first.");
  });

  it("rejects a whitespace-only body", () => {
    expect(validateMessageBody("   \n\t  ")).toBe("Write a message first.");
  });

  it("rejects a body over the maximum length", () => {
    const error = validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1));
    expect(error).not.toBeNull();
    expect(error).toContain(String(MAX_MESSAGE_LENGTH));
  });

  it("accepts a body exactly at the maximum length", () => {
    expect(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH))).toBeNull();
  });

  it("accepts ordinary text", () => {
    expect(validateMessageBody(" Is the calculator still free? ")).toBeNull();
  });
});

describe("previewOf", () => {
  it("collapses newlines and runs of whitespace into single spaces", () => {
    expect(previewOf("  Hi there!\n\nIs this\t still  available? ")).toBe(
      "Hi there! Is this still available?",
    );
  });

  it("truncates to the inbox row length", () => {
    const preview = previewOf("x".repeat(300));
    expect(preview).toHaveLength(90);
  });
});

describe("conversationKey", () => {
  const LISTING = toEntityId("507f1f77bcf86cd7994390aa");
  const ALEX = toEntityId("507f1f77bcf86cd799439011");
  const PRIYA = toEntityId("507f1f77bcf86cd799439022");
  const SAM = toEntityId("507f1f77bcf86cd799439033");

  it("is the same whichever side starts the thread", () => {
    expect(conversationKey(LISTING, [ALEX, PRIYA])).toBe(
      conversationKey(LISTING, [PRIYA, ALEX]),
    );
  });

  it("gives a DIFFERENT key for a second buyer on the same listing", () => {
    // The bug this replaced: a unique index on the participantIds array is multikey, so it
    // enforced one thread per listing per *person* — the seller. The second buyer to
    // message a seller failed with E11000 instead of opening their own thread.
    expect(conversationKey(LISTING, [ALEX, PRIYA])).not.toBe(
      conversationKey(LISTING, [ALEX, SAM]),
    );
  });

  it("separates the same pair talking about two different listings", () => {
    const other = toEntityId("507f1f77bcf86cd7994390bb");
    expect(conversationKey(LISTING, [ALEX, PRIYA])).not.toBe(
      conversationKey(other, [ALEX, PRIYA]),
    );
  });
});
