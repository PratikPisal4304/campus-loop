import "server-only";
import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import { InvariantViolationError } from "@/core/domain/errors";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { connectToDatabase } from "./connection";

/**
 * Run `work` inside a MongoDB transaction. Requires a replica set — see
 * docker-compose.dev.yml for why that is not optional here.
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    // A holder rather than a bare `let`: the callback can retry on a transient commit
    // error, and this keeps the last run's value without needing a non-null assertion.
    const holder: { value?: T } = {};
    await session.withTransaction(async () => {
      holder.value = await work(session);
    });
    if (!("value" in holder)) {
      throw new InvariantViolationError("Transaction committed without running its body.");
    }
    return holder.value as T;
  } finally {
    await session.endSession();
  }
}

/**
 * The port-friendly form: hands the caller an opaque `UnitOfWork` so use cases can pass a
 * transaction across repositories without ever seeing a Mongo session.
 */
export function withUnitOfWork<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
  return withTransaction((session) => work({ handle: session }));
}

/** Unwrap a UnitOfWork back into a driver session. Infrastructure adapters only. */
export function sessionFrom(uow?: UnitOfWork): ClientSession | undefined {
  return uow?.handle as ClientSession | undefined;
}
