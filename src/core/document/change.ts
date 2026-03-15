import type { Range } from "@core/position";

export interface Change {
  range: Range;
  insertedText: string;
  removedText: string;
}
