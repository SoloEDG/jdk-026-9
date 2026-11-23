import type { Puzzle } from "../../../shared/types";
import { artworkSvg } from "../lib/artwork";
export function downloadArtwork(puzzle: Puzzle): void {
  const url = URL.createObjectURL(
    new Blob([artworkSvg(puzzle)], { type: "image/svg+xml" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `gejian-${puzzle.id}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
