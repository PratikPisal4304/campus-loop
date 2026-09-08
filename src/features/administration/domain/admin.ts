export const ADMIN_SECTIONS = ["users", "listings", "deals", "reports", "email"] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export function isAdminSection(value: string): value is AdminSection {
  return ADMIN_SECTIONS.some((s) => s === value);
}
export interface AdminRecord {
  id: string;
  cells: string[];
  actions: { value: string; label: string }[];
}
export interface AdminPage {
  columns: string[];
  records: AdminRecord[];
  total: number;
}

/** Quoting alone doesn't prevent formulas in spreadsheet applications. */
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
