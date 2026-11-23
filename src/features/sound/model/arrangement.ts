import type { Arrangement, Mark, SoundScore, VoiceId } from "../../../shared/types";
import { SCALES } from "./scales";

export const MIN_TEMPO = 60;
export const MAX_TEMPO = 180;
export const MIN_BARS = 1;
export const MAX_BARS = 4;
export const MIN_OCTAVE = 2;
export const MAX_OCTAVE = 4;

export const VOICES: Record<VoiceId, { label: string; hint: string }> = {
  bell: { label: "钟铃", hint: "清亮绵长" },
  pluck: { label: "拨弦", hint: "短促利落" },
  pad: { label: "柔垫", hint: "温润和声" },
};

export const VOICE_OPTIONS = Object.entries(VOICES).map(([id, v]) => ({
  id: id as VoiceId,
  label: v.label,
  hint: v.hint,
}));

export const DEFAULT_ARRANGEMENT: Arrangement = {
  scale: "pentatonic",
  tempo: 96,
  voice: "bell",
  baseOctave: 3,
  bars: 1,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeArrangement(
  value: Partial<Arrangement> | null | undefined,
): Arrangement {
  const base = { ...DEFAULT_ARRANGEMENT, ...(value ?? {}) };
  return {
    scale:
      base.scale in SCALES ? base.scale : DEFAULT_ARRANGEMENT.scale,
    tempo: clamp(Math.round(Number(base.tempo) || DEFAULT_ARRANGEMENT.tempo), MIN_TEMPO, MAX_TEMPO),
    voice:
      base.voice in VOICES ? base.voice : DEFAULT_ARRANGEMENT.voice,
    baseOctave: clamp(
      Math.round(Number(base.baseOctave) || DEFAULT_ARRANGEMENT.baseOctave),
      MIN_OCTAVE,
      MAX_OCTAVE,
    ),
    bars: clamp(
      Math.round(Number(base.bars) || DEFAULT_ARRANGEMENT.bars),
      MIN_BARS,
      MAX_BARS,
    ),
  };
}

/** 只把已填格转为 0/1 图案；标空与未知都视作休止（0）。 */
export function marksToPattern(marks: readonly Mark[]): number[] {
  return marks.map((m) => (m === "filled" ? 1 : 0));
}

export function patternFilledCount(pattern: readonly number[]): number {
  return pattern.reduce((sum, v) => sum + (v ? 1 : 0), 0);
}

/**
 * 生成一份不可变的已确认编排快照。
 * 保存后棋盘再被修改也不会影响这份谱子——展柜回听与导出只认它。
 */
export function createScore(
  marks: readonly Mark[],
  arrangement: Arrangement,
  now: number = Date.now(),
): SoundScore {
  return {
    version: 1,
    arrangement: normalizeArrangement(arrangement),
    pattern: marksToPattern(marks),
    updatedAt: now,
  };
}

/** 读取存档时校验谱子结构，损坏则返回 null，绝不让坏数据进入播放器。 */
export function parseScore(value: unknown, size: number): SoundScore | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SoundScore>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.pattern) || candidate.pattern.length !== size * size)
    return null;
  if (!candidate.pattern.every((v) => v === 0 || v === 1)) return null;
  if (
    !candidate.arrangement ||
    typeof candidate.arrangement !== "object" ||
    !((candidate.arrangement as Arrangement).scale in SCALES)
  )
    return null;
  return {
    version: 1,
    arrangement: normalizeArrangement(candidate.arrangement),
    pattern: candidate.pattern.slice(),
    updatedAt: Number(candidate.updatedAt) || Date.now(),
  };
}
