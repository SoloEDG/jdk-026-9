import type { GameAction, GameDocument, Puzzle } from "../shared/types";
import { isSolved, newSession } from "../shared/document";
import { applyMark, undoMark } from "../features/board";
import { HINT_LIMIT } from "../features/assist";
import { registerSolve } from "../features/journal";
export function transition(
  document: GameDocument,
  action: GameAction,
  puzzles: Puzzle[],
): GameDocument {
  const puzzle = puzzles.find((p) => p.id === document.activeId)!;
  const current = document.sessions[puzzle.id];
  if (action.type === "open") {
    const target = puzzles.find((p) => p.id === action.id);
    return target
      ? {
          ...document,
          activeId: target.id,
          sessions: {
            ...document.sessions,
            [target.id]: document.sessions[target.id] ?? newSession(target),
          },
        }
      : document;
  }
  let next = current;
  if (action.type === "mark")
    next = applyMark(current, action.index, action.mark);
  if (action.type === "undo") next = undoMark(current);
  if (action.type === "hint" && current.hints < HINT_LIMIT && !current.solved) {
    const marked = applyMark(current, action.index, action.mark);
    if (marked !== current) next = { ...marked, hints: current.hints + 1 };
  }
  if (action.type === "check" && !current.solved)
    next = { ...current, checks: current.checks + 1 };
  if (action.type === "tick" && !current.solved)
    next = { ...current, seconds: current.seconds + 1 };
  if (action.type === "reset") next = newSession(puzzle);
  if (next === current) return document;
  next = { ...next, solved: isSolved(puzzle, next) };
  const withRecord = registerSolve(document, puzzle, next);
  return {
    ...withRecord,
    sessions: { ...withRecord.sessions, [puzzle.id]: next },
  };
}
