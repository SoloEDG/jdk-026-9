import type { Puzzle, Session } from "../../../shared/types";
export function inspect(
  puzzle: Puzzle,
  session: Session,
): { filled: number; crossed: number; errors: number } {
  return {
    filled: session.marks.filter((m) => m === "filled").length,
    crossed: session.marks.filter((m) => m === "cross").length,
    errors: session.marks.filter(
      (m, i) =>
        (m === "filled" && !puzzle.solution[i]) ||
        (m === "cross" && !!puzzle.solution[i]),
    ).length,
  };
}
