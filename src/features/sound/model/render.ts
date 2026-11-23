import type { SoundScore } from "../../../shared/types";
import {
  type Plate,
  barsCovering,
  eventsAtStep,
  plateFromScore,
} from "./score";
import { triggerVoice } from "./engine";

export const EXPORT_DURATIONS = [8, 16, 30] as const;
export type ExportTarget = (typeof EXPORT_DURATIONS)[number];
const SAMPLE_RATE = 44100;

/**
 * 离线渲染一份"已确认"的编排快照。
 * 这里只接收 SoundScore（保存时的固定谱面），与实时棋盘完全隔离：
 * 玩家在导出期间继续修改棋盘，成品也不会中途换谱。
 * 未保存的编排无法导出，因此也绝不会提前泄露尚未解出的答案。
 */
export async function renderScoreWav(
  score: SoundScore,
  targetSeconds: ExportTarget,
): Promise<Blob> {
  const plate = plateFromScore(score);
  const totalBars = barsCovering(plate, targetSeconds);
  const duration = totalBars * plate.barDuration + 0.25;
  const length = Math.ceil(duration * SAMPLE_RATE);

  const OfflineCtor =
    globalThis.OfflineAudioContext ??
    (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!OfflineCtor) throw new Error("OfflineAudioContext unsupported");

  const ctx = new OfflineCtor(1, length, SAMPLE_RATE);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const compressor = ctx.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(ctx.destination);

  let when = 0;
  const totalSteps = totalBars * plate.barSteps;
  for (let step = 0; step < totalSteps; step++) {
    const events = eventsAtStep(plate, step);
    for (const event of events) {
      triggerVoice(
        ctx,
        master,
        plate.arrangement.voice,
        event,
        when,
        plate.stepDuration,
        1,
        () => true,
      );
    }
    when += plate.stepDuration;
  }

  const buffer = await ctx.startRendering();
  return encodeWav(buffer);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channelCount = 1;
  const samples = buffer.getChannelData(0);
  const dataSize = samples.length * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

export function downloadWav(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 导出实际时长（向上取整到完整小节，避免在乐句中间截断）。 */
export function actualExportSeconds(score: SoundScore, target: ExportTarget): number {
  const plate: Plate = plateFromScore(score);
  return barsCovering(plate, target) * plate.barDuration;
}
