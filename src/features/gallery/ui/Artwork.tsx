import type { Puzzle } from "../../../shared/types";
export function Artwork({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div
      className="artwork"
      style={{ gridTemplateColumns: `repeat(${puzzle.size},1fr)` }}
      aria-label={puzzle.title}
    >
      {puzzle.solution.map((v, i) => (
        <span
          key={i}
          style={{ background: v ? puzzle.color : "transparent" }}
        />
      ))}
    </div>
  );
}
