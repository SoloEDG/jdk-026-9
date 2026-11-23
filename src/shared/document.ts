import type { GameDocument, Puzzle, Session } from "./types";
export function newSession(puzzle: Puzzle): Session {
  return {
    puzzleId: puzzle.id,
    marks: Array(puzzle.size ** 2).fill("unknown"),
    moves: [],
    hints: 0,
    checks: 0,
    seconds: 0,
    solved: false,
    updatedAt: Date.now(),
  };
}
export function newDocument(puzzle: Puzzle): GameDocument {
  return {
    version: 1,
    activeId: puzzle.id,
    sessions: { [puzzle.id]: newSession(puzzle) },
    records: [],
  };
}
export function completion(session: Session): number {
  return Math.round(
    (session.marks.filter((m) => m !== "unknown").length /
      session.marks.length) *
      100,
  );
}
export function isSolved(puzzle: Puzzle, session: Session): boolean {
  return session.marks.every((mark, i) =>
    puzzle.solution[i] ? mark === "filled" : mark !== "filled",
  );
}
