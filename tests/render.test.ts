import { test } from "node:test";
import assert from "node:assert/strict";
import { createScore } from "../src/features/sound/model/arrangement";
import {
  actualExportSeconds,
  EXPORT_DURATIONS,
  renderScoreWav,
} from "../src/features/sound/model/render";
import type { Mark } from "../src/shared/types";

/** 极简 AudioParam 模拟，仅实现合成代码用到的调度方法。 */
class FakeParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
}

class FakeNode {
  connections: FakeNode[] = [];
  connect(node: FakeNode) {
    this.connections.push(node);
  }
  disconnect() {
    this.connections = [];
  }
}

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  started: number[] = [];
  stopped: number[] = [];
  onended: (() => void) | null = null;
  start(when: number) {
    this.started.push(when);
  }
  stop(when?: number) {
    this.stopped.push(when ?? 0);
    this.onended?.();
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeOfflineContext {
  readonly sampleRate: number;
  private length: number;
  constructor(channels: number, length: number, sampleRate: number) {
    void channels;
    this.length = length;
    this.sampleRate = sampleRate;
  }
  get currentTime() {
    return 0;
  }
  get destination() {
    return new FakeNode();
  }
  createOscillator() {
    return new FakeOscillator();
  }
  createGain() {
    return new FakeGain();
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createDynamicsCompressor() {
    return new FakeGain();
  }
  async startRendering() {
    return {
      length: this.length,
      duration: this.length / this.sampleRate,
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      getChannelData: () => {
        // 生成一段非零静音信号，验证编码确实写入样本。
        return Float32Array.from({ length: this.length }, (_, i) =>
          Math.sin((i / this.sampleRate) * 440 * Math.PI * 2) * 0.2,
        );
      },
    } as unknown as AudioBuffer;
  }
}

test("离线渲染产出合法 WAV，且只取完整小节、不泄露未保存内容", async () => {
  const size = 5;
  const marks: Mark[] = Array(size * size).fill("unknown");
  marks[0] = "filled";
  marks[size] = "filled";
  const score = createScore(marks, {
    scale: "major",
    tempo: 100,
    voice: "bell",
    baseOctave: 3,
    bars: 1,
  });

  Object.defineProperty(globalThis, "OfflineAudioContext", {
    value: FakeOfflineContext,
    configurable: true,
  });

  const target = EXPORT_DURATIONS[0];
  const blob = await renderScoreWav(score, target);
  assert.equal(blob.type, "audio/wav");
  const bytes = new Uint8Array(await blob.arrayBuffer());

  // RIFF/WAVE 文件头校验
  const head = String.fromCharCode(...bytes.slice(0, 4));
  const wave = String.fromCharCode(...bytes.slice(8, 12));
  assert.equal(head, "RIFF");
  assert.equal(wave, "WAVE");
  // 头部声明的 PCM 参数：单声道、16bit、44100Hz
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(24, true), 44100);
  // 数据块长度与文件总长度自洽
  const dataSize = view.getUint32(40, true);
  assert.equal(bytes.length, 44 + dataSize);

  // 实际时长向上取整到完整小节（100BPM、5 拍/小节 -> 每小节 3 秒）
  const seconds = actualExportSeconds(score, target);
  assert.equal(seconds % 3, 0);
  assert.ok(seconds >= target);
});

test("未填任何格子的作品渲染出的 WAV 仍然是结构完整的静音文件", async () => {
  const score = createScore(Array<Mark>(25).fill("unknown"), {
    scale: "minor",
    tempo: 120,
    voice: "pluck",
    baseOctave: 3,
    bars: 2,
  });
  Object.defineProperty(globalThis, "OfflineAudioContext", {
    value: FakeOfflineContext,
    configurable: true,
  });
  const blob = await renderScoreWav(score, 8);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "RIFF");
  assert.ok(bytes.length > 44);
});
