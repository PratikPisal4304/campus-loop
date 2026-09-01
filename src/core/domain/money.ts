import { InvariantViolationError } from "./errors";

/**
 * Money as integer paise.
 *
 * Floating-point rupees are banned project-wide: `0.1 + 0.2 !== 0.3`, and a marketplace
 * that quietly loses a paisa per listing is a marketplace nobody trusts. Every amount is
 * stored, compared and arithmetic'd as a whole number of the minor unit, and only ever
 * turned into a human string at the very edge — see `format()`.
 */
export class Money {
  private constructor(readonly paise: number) {}

  static fromPaise(paise: number): Money {
    if (!Number.isInteger(paise)) {
      throw new InvariantViolationError(`Money must be whole paise, received ${paise}.`);
    }
    return new Money(paise);
  }

  /** For parsing user input, which arrives in rupees. Rounds to the nearest paisa. */
  static fromRupees(rupees: number): Money {
    if (!Number.isFinite(rupees)) {
      throw new InvariantViolationError(`Money must be a finite number, received ${rupees}.`);
    }
    return new Money(Math.round(rupees * 100));
  }

  static readonly zero = new Money(0);

  static sum(amounts: readonly Money[]): Money {
    return new Money(amounts.reduce((total, amount) => total + amount.paise, 0));
  }

  add(other: Money): Money {
    return new Money(this.paise + other.paise);
  }

  subtract(other: Money): Money {
    return new Money(this.paise - other.paise);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.paise * factor));
  }

  clampToZero(): Money {
    return this.paise < 0 ? Money.zero : this;
  }

  get isZero(): boolean {
    return this.paise === 0;
  }

  get isPositive(): boolean {
    return this.paise > 0;
  }

  equals(other: Money): boolean {
    return this.paise === other.paise;
  }

  greaterThan(other: Money): boolean {
    return this.paise > other.paise;
  }

  lessThan(other: Money): boolean {
    return this.paise < other.paise;
  }

  /** Rupees as a number — for serialising to a form field, never for arithmetic. */
  get rupees(): number {
    return this.paise / 100;
  }

  /**
   * Human-readable amount. Call this only from `presentation/` — formatting inside a use
   * case is how currency strings end up compared, parsed, and stored by accident.
   */
  format(): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      // Student prices are whole rupees far more often than not; "₹500" reads better
      // than "₹500.00" on a listing card, but "₹499.50" still renders in full.
      minimumFractionDigits: this.paise % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(this.rupees);
  }
}
