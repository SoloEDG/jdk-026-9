import { useCallback, useEffect, useRef, useState } from "react";
import type { SoundScore } from "../../../shared/types";
import { type EngineState, SoundEngine } from "../model/engine";
import { plateFromScore } from "../model/score";

/**
 * 展柜回听：只接受保存时确定下来的 SoundScore 快照，
 * 与工作台的实时棋盘没有任何共享状态，编辑棋盘不会影响这里的声音。
 */
export function useGalleryPlayback() {
  const engineRef = useRef<SoundEngine | null>(null);
  if (!engineRef.current) engineRef.current = new SoundEngine();
  const engine = engineRef.current;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<EngineState>(engine.state);

  useEffect(() => engine.onChange(setState), [engine]);
  useEffect(() => () => engine.stop(), [engine]);

  const play = useCallback(
    (id: string, score: SoundScore) => {
      if (activeId === id && engine.state === "paused") {
        engine.resumePlay();
        return;
      }
      setActiveId(id);
      engine.start(plateFromScore(score));
    },
    [engine, activeId],
  );

  const pause = useCallback(() => engine.pause(), [engine]);
  const stop = useCallback(() => {
    engine.stop();
    setActiveId(null);
  }, [engine]);

  return { activeId, state, play, pause, stop };
}
