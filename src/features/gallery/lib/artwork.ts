import type { GameDocument, Puzzle } from "../../../shared/types";
export function unlockedArt(
  puzzles: Puzzle[],
  document: GameDocument,
): Puzzle[] {
  return puzzles.filter((p) =>
    document.records.some((r) => r.puzzleId === p.id),
  );
}
export function artworkSvg(puzzle: Puzzle): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${puzzle.size} ${puzzle.size}"><rect width="100%" height="100%" fill="#f2f4f8"/>${puzzle.solution.map((v, i) => (v ? `<rect x="${i % puzzle.size}" y="${Math.floor(i / puzzle.size)}" width="1" height="1" fill="${puzzle.color}"/>` : "")).join("")}</svg>`;
}
