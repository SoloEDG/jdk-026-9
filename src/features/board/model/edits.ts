import type { Mark, Session } from "../../../shared/types";
export function applyMark(
  session: Session,
  index: number,
  mark: Mark,
): Session {
  if (
    session.solved ||
    index < 0 ||
    index >= session.marks.length ||
    session.marks[index] === mark
  )
    return session;
  const marks = [...session.marks];
  const before = marks[index];
  marks[index] = mark;
  return {
    ...session,
    marks,
    moves: [...session.moves, { index, before, after: mark }].slice(-500),
    updatedAt: Date.now(),
  };
}
export function undoMark(session: Session): Session {
  const move = session.moves.at(-1);
  if (!move || session.solved) return session;
  const marks = [...session.marks];
  marks[move.index] = move.before;
  return {
    ...session,
    marks,
    moves: session.moves.slice(0, -1),
    updatedAt: Date.now(),
  };
}
