import type { Mark, Puzzle, Session } from "../../../shared/types";
export const HINT_LIMIT = 3;
export function nextHint(
  puzzle: Puzzle,
  session: Session,
): { index: number; mark: Mark } | null {
  if (session.hints >= HINT_LIMIT || session.solved) return null;
  const index = session.marks.findIndex((m, i) =>
    puzzle.solution[i] ? m !== "filled" : m === "filled" || m === "unknown",
  );
  return index < 0
    ? null
    : { index, mark: puzzle.solution[index] ? "filled" : "cross" };
}
