import type { Arrangement, VoiceId } from "../../../shared/types";
import {
  type NoteEvent,
  type Plate,
  VOICE_GAIN,
  eventsAtStep,
  shouldSwapPlate,
} from "../model/score";

export type EngineState = "stopped" | "playing" | "paused" | "unavailable";

export interface Playhead {
  /** 当前循环内的列（拍位），用于棋盘高亮。 */
  step: number;
  /** 当前小节序号（从 0 开始）。 */
  bar: number;
  /** 本次演奏累计已调度的拍数。 */
  absoluteStep: number;
}

const LOOK_AHEAD_SECONDS = 0.12;
const TIMER_MS = 25;

/**
 * 声音引擎。
 *
 * 节奏稳定优先：所有音符都通过 AudioContext 的音频时钟提前调度，
 * 绝不使用 setTimeout 直接触发声音——因此页面卡顿、标签页隐藏或
 * 浏览器拒绝音频时，都不会积压一串"补播"的声音。
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | null = null;
  private generation = 0;
  /** 已调度但可能尚未起音的振荡器，换盘或停止时用于精确取消。 */
  private activeVoices = new Map<OscillatorNode, number>();

  state: EngineState = "stopped";
  private plate: Plate | null = null;
  private pendingPlate: Plate | null = null;
  private stepCount = 0;
  private nextNoteTime = 0;
  private lastStepTime = 0;
  private lastScheduledStep = 0;

  private listeners = new Set<(state: EngineState) => void>();

  /** 惰性创建 AudioContext；浏览器拒绝（构造抛错或恢复失败）时返回 false。 */
  ensure(): boolean {
    if (this.ctx) {
      if (this.state === "unavailable") return false;
      return true;
    }
    try {
      const Ctor =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) throw new Error("AudioContext unsupported");
      this.ctx = new Ctor();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(compressor);
      this.bus = this.ctx.createGain();
      this.bus.connect(this.master);
      if (this.ctx.state === "closed") throw new Error("context closed");
      this.setState("stopped");
      return true;
    } catch {
      this.ctx = null;
      this.setState("unavailable");
      return false;
    }
  }

  onChange(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: EngineState) {
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  /** 从停止态开始一整张谱盘的循环演奏。 */
  start(plate: Plate) {
    if (!this.ensure() || !this.ctx || !this.master) return;
    this.plate = plate;
    this.pendingPlate = null;
    this.stepCount = 0;
    this.generation += 1;
    this.activeVoices.clear();
    // 每次演奏使用独立总线，停止时断开即可让残留音符全部静音。
    this.bus?.disconnect();
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.master);
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    void this.ctx.resume().then(
      () => this.runScheduler(),
      () => this.setState("unavailable"),
    );
    this.setState("playing");
  }

  /**
   * 暂停：挂起音频时钟。已调度但还没发出的音符会随时钟一起冻结，
   * 恢复后仍在原拍位响起，不会产生积压补播。
   */
  pause() {
    if (this.state !== "playing" || !this.ctx) return;
    this.clearTimer();
    void this.ctx.suspend();
    this.setState("paused");
  }

  resumePlay() {
    if (this.state !== "paused" || !this.ctx || !this.plate) return;
    void this.ctx.resume().then(
      () => {
        // 时钟曾冻结，旧的调度时间依然有效；留一点缓冲再继续。
        this.nextNoteTime = Math.max(
          this.nextNoteTime,
          this.ctx!.currentTime + 0.08,
        );
        this.runScheduler();
        this.setState("playing");
      },
      () => this.setState("unavailable"),
    );
  }

  stop() {
    this.clearTimer();
    this.pendingPlate = null;
    this.stepCount = 0;
    // 停掉所有尚未起音的音符，避免停止后仍听到前瞻调度的声音。
    for (const osc of this.activeVoices.keys()) {
      try {
        osc.stop();
      } catch {
        /* 忽略已停止的振荡器 */
      }
    }
    this.activeVoices.clear();
    if (this.ctx && this.bus) {
      const oldBus = this.bus;
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.master!);
      // 断开旧总线，尚未发声的调度事件即使存在也无法再被听到。
      oldBus.disconnect();
    }
    if (this.ctx && this.state !== "unavailable") void this.ctx.suspend();
    this.setState("stopped");
  }

  /**
   * 演奏中请求更换谱盘。新谱盘不会立刻插入，而是在下一个小节边界
   * 与当前谱盘整体交换，保证一次循环内所有声部使用同一份谱。
   */
  requestPlate(plate: Plate) {
    if (this.state === "stopped" || !this.plate) {
      this.plate = plate;
      return;
    }
    this.pendingPlate = plate;
  }

  hasPendingPlate(): boolean {
    return this.pendingPlate !== null;
  }

  getPlayhead(): Playhead | null {
    if (!this.ctx || !this.plate || this.state === "stopped") return null;
    const loopSteps = this.plate.barSteps * this.plate.arrangement.bars;
    const behind =
      (this.ctx.currentTime - this.lastStepTime) / this.plate.stepDuration;
    const absolute = Math.max(
      0,
      Math.min(this.stepCount, this.lastScheduledStep + Math.floor(behind)),
    );
    const step = absolute % this.plate.barSteps;
    return {
      step,
      bar: Math.floor(absolute / this.plate.barSteps) % this.plate.arrangement.bars,
      absoluteStep: absolute % loopSteps,
    };
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private runScheduler() {
    this.clearTimer();
    this.timer = window.setInterval(() => this.scheduleAhead(), TIMER_MS);
  }

  private scheduleAhead() {
    if (!this.ctx || !this.plate || this.state !== "playing") return;
    while (
      this.ctx.currentTime + LOOK_AHEAD_SECONDS > this.nextNoteTime &&
      this.plate
    ) {
      // 小节边界：若有等待中的新谱盘，在此原子替换。
      if (
        shouldSwapPlate(
          this.stepCount,
          this.plate.barSteps,
          this.pendingPlate !== null,
        )
      ) {
        // 取消旧谱盘被前瞻调度到本小节之后的音符；已起音的保留衰减。
        this.cancelFutureVoices(this.nextNoteTime);
        this.plate = this.pendingPlate!;
        this.pendingPlate = null;
      }
      const plate: Plate = this.plate;
      const loopSteps = plate.barSteps * plate.arrangement.bars;
      const localStep = this.stepCount % loopSteps;
      const events = eventsAtStep(plate, localStep);
      for (const event of events) {
        this.trigger(plate.arrangement, event, this.nextNoteTime);
      }
      this.lastStepTime = this.nextNoteTime;
      this.lastScheduledStep = this.stepCount;
      this.nextNoteTime += plate.stepDuration;
      this.stepCount += 1;
      if (this.stepCount >= loopSteps) this.stepCount = 0;
    }
  }

  private trigger(arrangement: Arrangement, event: NoteEvent, when: number) {
    if (!this.ctx || !this.bus) return;
    const runGeneration = this.generation;
    const ctx = this.ctx;
    const bus = this.bus;
    const step = 60 / arrangement.tempo;
    const created: OscillatorNode[] = [];
    triggerVoice(
      ctx,
      bus,
      arrangement.voice,
      event,
      when,
      step,
      runGeneration,
      (g) => g === this.generation,
      (osc) => {
        created.push(osc);
        this.activeVoices.set(osc, when);
        osc.onended = () => this.activeVoices.delete(osc);
      },
    );
  }

  /**
   * 取消所有"起音时间不早于 boundary"且属于当前一代的振荡器。
   * 已经开始发声的音符保留其自然衰减，避免突兀的爆音。
   */
  private cancelFutureVoices(boundary: number) {
    for (const [osc, when] of this.activeVoices) {
      if (when >= boundary - 1e-6) {
        try {
          osc.stop();
        } catch {
          /* 已停止的振荡器忽略 */
        }
        this.activeVoices.delete(osc);
      }
    }
  }
}

interface VoiceContext {
  currentTime: number;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  createBiquadFilter?(): BiquadFilterNode;
}

/**
 * 单个声部的合成。实时 AudioContext 与离线 OfflineAudioContext
 * 共用同一套合成逻辑，保证"听到的"与"导出的"声音一致。
 */
export function triggerVoice(
  ctx: VoiceContext,
  output: AudioNode,
  voice: VoiceId,
  event: NoteEvent,
  when: number,
  stepDuration: number,
  generation: number,
  isCurrent: (generation: number) => boolean,
  onOscillator?: (osc: OscillatorNode) => void,
): void {
  const apply = (node: AudioNode) => {
    // 停止或换盘后，旧一代调度到未来的音符不再真正接入输出。
    if (!isCurrent(generation)) return;
    node.connect(output);
  };
  const track = (osc: OscillatorNode) => onOscillator?.(osc);
  const gain = ctx.createGain();
  const peak = event.velocity * VOICE_GAIN[voice];

  if (voice === "bell") {
    const osc = ctx.createOscillator();
    const partial = ctx.createOscillator();
    osc.type = "sine";
    partial.type = "sine";
    osc.frequency.value = event.frequency;
    partial.frequency.value = event.frequency * 2.01;
    const partialGain = ctx.createGain();
    partialGain.gain.value = 0.28;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.5, stepDuration * 2.4));
    osc.connect(gain);
    partial.connect(partialGain);
    partialGain.connect(gain);
    apply(gain);
    track(osc);
    track(partial);
    osc.start(when);
    partial.start(when);
    osc.stop(when + stepDuration * 2.6);
    partial.stop(when + stepDuration * 2.6);
    return;
  }

  if (voice === "pluck") {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = event.frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.min(0.45, stepDuration * 1.4));
    osc.connect(gain);
    apply(gain);
    track(osc);
    osc.start(when);
    osc.stop(when + stepDuration * 1.6);
    return;
  }

  // pad：两只略微失谐的锯齿波经低通，起音缓慢，适合铺底和声。
  const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;
  const tail = filter ?? gain;
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = "sawtooth";
  oscB.type = "sawtooth";
  oscA.frequency.value = event.frequency;
  oscB.frequency.value = event.frequency * 1.005;
  if (filter) {
    filter.type = "lowpass";
    filter.frequency.value = Math.min(2400, event.frequency * 4);
    filter.Q.value = 0.4;
  }
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak * 0.8, when + Math.min(0.18, stepDuration * 0.4));
  gain.gain.setValueAtTime(peak * 0.8, when + stepDuration * 0.9);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + stepDuration * 1.8);
  oscA.connect(tail);
  oscB.connect(tail);
  if (filter) filter.connect(gain);
  apply(gain);
  track(oscA);
  track(oscB);
  oscA.start(when);
  oscB.start(when);
  oscA.stop(when + stepDuration * 2);
  oscB.stop(when + stepDuration * 2);
}
