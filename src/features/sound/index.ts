export { SoundCanvasPanel } from "./ui/SoundCanvasPanel";
export { GallerySound } from "./ui/GallerySound";
export { useSoundCanvas } from "./ui/useSoundCanvas";
export { useGalleryPlayback } from "./ui/useGalleryPlayback";
export { createPlate, eventsAtStep, nextBarBoundary, shouldSwapPlate, plateFromScore, barsCovering, loopDuration } from "./model/score";
export {
  DEFAULT_ARRANGEMENT,
  createScore,
  marksToPattern,
  normalizeArrangement,
  parseScore,
  patternFilledCount,
} from "./model/arrangement";
export { rowToMidi, midiToFrequency, SCALES } from "./model/scales";
export { SoundEngine } from "./model/engine";
export {
  EXPORT_DURATIONS,
  actualExportSeconds,
  renderScoreWav,
} from "./model/render";
export type { SoundCanvasApi } from "./ui/useSoundCanvas";
export type { Plate, NoteEvent } from "./model/score";
export type { EngineState, Playhead } from "./model/engine";
