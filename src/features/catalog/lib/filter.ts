import type { Puzzle } from "../../../shared/types";
export function filterPuzzles(
  puzzles: Puzzle[],
  query: string,
  level: string,
): Puzzle[] {
  return puzzles.filter(
    (p) =>
      (level === "全部" || p.level === level) &&
      (p.title + p.collection + p.size).includes(query.trim()),
  );
}
export function difficultyDots(level: Puzzle["level"]): number {
  return level === "入门" ? 1 : level === "进阶" ? 2 : 3;
}
