import { expect, it } from "vitest";
import { csvCell } from "./admin";
it("escapes spreadsheet formulas, quotes and multiline fields", () => {
  expect(csvCell(' =HYPERLINK("evil")')).toBe('"\' =HYPERLINK(""evil"")"');
  expect(csvCell("normal, value\nnext")).toBe('"normal, value\nnext"');
  expect(csvCell("+cmd")).toBe('"\'+cmd"');
});
