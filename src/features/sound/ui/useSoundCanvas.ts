import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Arrangement,
  Mark,
  Puzzle,
  SoundScore,
} from "../../../shared/types";
import {
  DEFAULT_ARRANGEMENT,
  createScore,
  normalizeArrangement,
} from "../model/arrangement";
import { type Plate, createPlate } from "../model/score";
import { type EngineState, type Playhead, SoundEngine } from "../model/engine";

export interface SoundCanvasApi {
  arrangement: Arrangement;
  state: EngineState;
  playhead: Playhead | null;
  /** 有修改正在等待下一小节边界生效。 */
  pending: boolean;
  /** 页面被隐藏等原因导致的自动暂停，需要用户手动恢复。 */
  autoPaused: boolean;
  savedScore: SoundScore | null;
  dirty: boolean;
  filledCount: number;
  setArrangement: (patch: Partial<Arrangement>) => void;
  toggle: () => void;
  stop: () => void;
  save: () => void;
  clearSaved: () => void;
}

/**
 * 工作台声音画布。
 * 棋盘与编排的任何变化都先形成一张新谱盘：停止时下次演奏直接使用；
 * 演奏中则挂起为 pending，由引擎在下一小节边界原子替换。
 */
export function useSoundCanvas(
  puzzle: Puzzle,
  marks: readonly Mark[],
  savedScore: SoundScore | null,
  onSave: (score: SoundScore) => void,
  onClear: () => void,
): SoundCanvasApi {
  const engineRef = useRef<SoundEngine | null>(null);
  if (!engineRef.current) engineRef.current = new SoundEngine();
  const engine = engineRef.current;

  const [arrangement, setArrangementState] = useState<Arrangement>(() =>
    normalizeArrangement(savedScore?.arrangement),
  );
  const [state, setState] = useState<EngineState>(engine.state);
  const [playhead, setPlayhead] = useState<Playhead | null>(null);
  const [pending, setPending] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);

  const plate: Plate = useMemo(
    () =>
      createPlate(
        marks.map((m) => (m === "filled" ? 1 : 0)),
        arrangement,
      ),
    [marks, arrangement],
  );

  // 切题 effect 只依赖题目 id，已保存编排通过 ref 读取最新值，避免闭包陈旧。
  const savedRef = useRef(savedScore);
  savedRef.current = savedScore;

  // 切题：停止演奏，丢弃任何未生效的谱盘，并载入本题已保存的编排。
  useEffect(() => {
    engine.stop();
    setArrangementState(normalizeArrangement(savedRef.current?.arrangement));
    setPending(false);
    setAutoPaused(false);
    setPlayhead(null);
  }, [puzzle.id, engine]);

  useEffect(() => engine.onChange(setState), [engine]);

  // 棋盘或编排变化：演奏中不打断当前小节，只登记新谱盘。
  useEffect(() => {
    if (engine.state === "playing" || engine.state === "paused") {
      engine.requestPlate(plate);
      setPending(true);
    }
  }, [plate, engine]);

  // 播放位置轮询：同时检查挂起谱盘是否已在小节边界完成替换。
  useEffect(() => {
    if (state !== "playing" && state !== "paused") {
      setPlayhead(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      setPlayhead(engine.getPlayhead());
      setPending(engine.hasPendingPlate());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, engine]);

  // 页面隐藏：浏览器会挂起音频时钟。主动暂停，恢复后不自动补播。
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && engine.state === "playing") {
        engine.pause();
        setAutoPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [engine]);

  useEffect(() => () => engine.stop(), [engine]);

  const setArrangement = useCallback((patch: Partial<Arrangement>) => {
    setArrangementState((prev) => normalizeArrangement({ ...prev, ...patch }));
  }, []);

  const toggle = useCallback(() => {
    if (engine.state === "playing") {
      engine.pause();
      return;
    }
    if (engine.state === "paused") {
      setAutoPaused(false);
      engine.resumePlay();
      return;
    }
    setAutoPaused(false);
    setPending(false);
    engine.start(plate);
  }, [engine, plate]);

  const stop = useCallback(() => {
    engine.stop();
    setPending(false);
    setAutoPaused(false);
  }, [engine]);

  const save = useCallback(() => {
    onSave(createScore(marks, arrangement));
  }, [marks, arrangement, onSave]);

  const clearSaved = useCallback(() => onClear(), [onClear]);

  const savedSignature = savedScore
    ? JSON.stringify([savedScore.pattern, savedScore.arrangement])
    : null;
  const currentSignature = JSON.stringify([
    plate.pattern,
    plate.arrangement,
  ]);
  const dirty = savedSignature !== currentSignature;
  const filledCount = plate.pattern.reduce((sum, v) => sum + v, 0);

  return {
    arrangement,
    state,
    playhead,
    pending,
    autoPaused,
    savedScore,
    dirty,
    filledCount,
    setArrangement,
    toggle,
    stop,
    save,
    clearSaved,
  };
}

export { DEFAULT_ARRANGEMENT };
