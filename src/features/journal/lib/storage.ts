import type { GameDocument, Mark, Puzzle } from "../../../shared/types";
import { newDocument, newSession, isSolved } from "../../../shared/document";
const KEY = "gejian.document.v1";
export function loadDocument(puzzles: Puzzle[]): {
  document: GameDocument;
  warning: string;
} {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { document: newDocument(puzzles[0]), warning: "" };
    const data = JSON.parse(raw) as GameDocument;
    if (data.version !== 1 || !data.sessions || !Array.isArray(data.records))
      throw Error("unsupported");
    const sessions: GameDocument["sessions"] = {};
    for (const puzzle of puzzles) {
      const saved = data.sessions[puzzle.id];
      if (
        saved &&
        Array.isArray(saved.marks) &&
        saved.marks.length === puzzle.size ** 2 &&
        saved.marks.every((m: Mark) =>
          ["filled", "unknown", "cross"].includes(m),
        )
      ) {
        const session = {
          ...newSession(puzzle),
          marks: saved.marks,
          hints: Math.min(3, Math.max(0, Number(saved.hints) || 0)),
          checks: Math.max(0, Number(saved.checks) || 0),
          seconds: Math.max(0, Number(saved.seconds) || 0),
          updatedAt: Date.now(),
        };
        sessions[puzzle.id] = { ...session, solved: isSolved(puzzle, session) };
      }
    }
    const active = puzzles.find((p) => p.id === data.activeId) ?? puzzles[0];
    sessions[active.id] ??= newSession(active);
    const records = data.records.filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        puzzles.some((p) => p.id === r.puzzleId) &&
        Number.isFinite(r.seconds) &&
        Number.isFinite(r.finishedAt) &&
        Number.isFinite(r.hints) &&
        Number.isFinite(r.checks),
    );
    return {
      document: { version: 1, activeId: active.id, sessions, records },
      warning: "",
    };
  } catch {
    return {
      document: newDocument(puzzles[0]),
      warning:
        "存档无法读取，已打开新的解题页。原存档未覆盖，请手动保存新进度。",
    };
  }
}
export function saveDocument(document: GameDocument): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}
