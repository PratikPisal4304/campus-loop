import "server-only";
import type { Prisma } from "@prisma/client";
import type { UnitOfWork } from "@/core/domain/unit-of-work";
import { prisma } from "./connection";

/**
 * A Prisma transaction client — the same query surface as `prisma`, scoped to one
 * transaction. This is what a `UnitOfWork` handle actually holds.
 */
export type TransactionClient = Prisma.TransactionClient;

/**
 * Run `work` inside a database transaction.
 *
 * Postgres gives us this natively, unlike the Mongo version this replaced, which needed a
 * replica set just to make transactions available at all.
 */
export function withTransaction<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => work(tx));
}

/**
 * The port-friendly form: hands the caller an opaque `UnitOfWork` so use cases can pass a
 * transaction across repositories without ever seeing Prisma.
 */
export function withUnitOfWork<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
  return withTransaction((tx) => work({ handle: tx }));
}

/**
 * Unwrap a UnitOfWork back into a query client. Infrastructure adapters only.
 *
 * Falls back to the plain client so a repository method can be called inside or outside a
 * transaction without branching at every call site.
 */
export function clientFrom(uow?: UnitOfWork): TransactionClient {
  return (uow?.handle as TransactionClient | undefined) ?? prisma;
}
