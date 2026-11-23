import type { Arrangement, SoundScore, VoiceId } from "../../../shared/types";
import { rowToMidi, midiToFrequency } from "./scales";

/**
 * 谱盘：一次演奏所依据的不可变快照。
 * 演奏中棋盘的修改不会直接改写当前谱盘，而是请求一张新谱盘，
 * 在当前小节结束时整体替换——保证不会出现一半声部旧谱、一半声部新谱。
 */
export interface Plate {
  size: number;
  pattern: number[];
  arrangement: Arrangement;
  /** 每个节拍的时长（秒），由速度决定：每分钟节拍数 -> 单拍秒数。 */
  stepDuration: number;
  /** 一小节（一次完整列扫描）包含的节拍数。 */
  barSteps: number;
  barDuration: number;
}

export function createPlate(
  pattern: readonly number[],
  arrangement: Arrangement,
): Plate {
  const size = Math.round(Math.sqrt(pattern.length));
  const stepDuration = 60 / arrangement.tempo;
  const barSteps = size;
  return {
    size,
    pattern: pattern.slice(),
    arrangement,
    stepDuration,
    barSteps,
    barDuration: stepDuration * barSteps,
  };
}

export function plateFromScore(score: SoundScore): Plate {
  return createPlate(score.pattern, score.arrangement);
}

export interface NoteEvent {
  /** 相对循环起点的拍位（列号）。 */
  step: number;
  row: number;
  midi: number;
  frequency: number;
  velocity: number;
}

/**
 * 把一列（一个节拍）上所有已填格转成同时发声的音符。
 * 同一列多个已填格即构成和弦；空列/标空列自然成为休止拍。
 */
export function eventsAtStep(plate: Plate, step: number): NoteEvent[] {
  const { size, pattern, arrangement } = plate;
  const col = step % size;
  const events: NoteEvent[] = [];
  for (let row = 0; row < size; row++) {
    // pattern 按行存储（row * size + col），同一列的格子需跨行读取。
    if (pattern[row * size + col]) {
      const midi = rowToMidi(row, size, arrangement.scale, arrangement.baseOctave);
      events.push({
        step: col,
        row,
        midi,
        frequency: midiToFrequency(midi),
        // 音越高力度越轻，避免顶部音符过于刺耳。
        velocity: 0.55 + ((size - 1 - row) / Math.max(1, size - 1)) * 0.25,
      });
    }
  }
  return events;
}

/**
 * 给定当前已播放的拍数，返回下一个小节边界的拍号。
 * 所有演奏中产生的修改都在这个边界上统一生效。
 */
export function nextBarBoundary(stepCount: number, barSteps: number): number {
  return (Math.floor(stepCount / barSteps) + 1) * barSteps;
}

/**
 * 是否应在当前拍位整体替换谱盘。
 * 仅允许在小节第一拍（stepCount 为 barSteps 的整数倍）替换，
 * 因此一次小节内所有声部始终使用同一份谱，不会半旧半新。
 */
export function shouldSwapPlate(
  stepCount: number,
  barSteps: number,
  hasPending: boolean,
): boolean {
  return hasPending && stepCount % barSteps === 0;
}

/** 整张谱盘完整演奏一遍（bars 个小节）的时长（秒）。 */
export function loopDuration(plate: Plate): number {
  return plate.barDuration * plate.arrangement.bars;
}

/** 计算覆盖目标时长所需的完整小节数（只取整小节，避免导出中途截断）。 */
export function barsCovering(plate: Plate, targetSeconds: number): number {
  return Math.max(
    plate.arrangement.bars,
    Math.ceil(targetSeconds / plate.barDuration),
  );
}

export const VOICE_GAIN: Record<VoiceId, number> = {
  bell: 0.5,
  pluck: 0.6,
  pad: 0.42,
};
