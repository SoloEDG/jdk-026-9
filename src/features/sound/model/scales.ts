import type { ScaleId } from "../../../shared/types";

/**
 * 各音阶相对根音的半音偏移（一个八度内的度数）。
 * 行映射到这些度数；行数超过音阶度数时，按度数循环并向上叠加八度，
 * 因此任何尺寸的棋盘都能得到稳定、不重复的音高。
 */
export const SCALES: Record<ScaleId, { label: string; intervals: number[] }> = {
  pentatonic: { label: "五声音阶", intervals: [0, 2, 4, 7, 9] },
  major: { label: "大调", intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: "小调", intervals: [0, 2, 3, 5, 7, 8, 10] },
  lydian: { label: "利底亚", intervals: [0, 2, 4, 6, 7, 9, 11] },
};

export const SCALE_OPTIONS = Object.entries(SCALES).map(([id, v]) => ({
  id: id as ScaleId,
  label: v.label,
}));

/** 根音固定为 C，MIDI 编号 60 = C4。 */
export const ROOT_MIDI = 60;

/**
 * 行号 -> MIDI 音高。
 * 顶行（row 0）音最高，底行最低，符合"越靠上声音越清亮"的直觉。
 * degreeIndex 从棋盘底部向上递增；行数超过音阶长度时自然跨八度循环。
 */
export function rowToMidi(
  row: number,
  size: number,
  scale: ScaleId,
  baseOctave: number,
): number {
  const intervals = SCALES[scale].intervals;
  const degreeIndex = size - 1 - row;
  const octave = Math.floor(degreeIndex / intervals.length);
  const degree = degreeIndex % intervals.length;
  return (
    ROOT_MIDI +
    (baseOctave - 4) * 12 +
    octave * 12 +
    intervals[degree]
  );
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
