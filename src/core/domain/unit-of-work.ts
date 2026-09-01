/**
 * An opaque handle to an in-flight transaction.
 *
 * Sending a message writes the Message *and* bumps the Conversation's preview and unread
 * counters; those must land together or not at all. Passing the driver's session object
 * through the ports would leak Mongo into the domain, so the handle is deliberately typed
 * as `unknown`: only the infrastructure adapter that created it knows how to read it.
 */
export interface UnitOfWork {
  readonly handle: unknown;
}
