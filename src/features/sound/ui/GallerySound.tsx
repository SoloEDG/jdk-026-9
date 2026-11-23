import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Pause, Play, Square } from "lucide-react";
import type { Puzzle, SoundScore } from "../../../shared/types";
import {
  EXPORT_DURATIONS,
  type ExportTarget,
  actualExportSeconds,
  downloadWav,
  renderScoreWav,
} from "../model/render";
import type { useGalleryPlayback } from "./useGalleryPlayback";

type Playback = ReturnType<typeof useGalleryPlayback>;

/**
 * 展柜作品的回听与导出入口。
 * 两者都只操作保存时确定的 SoundScore 快照：
 * 实时棋盘编辑无法改动它，未解出的答案也不会从这里提前发声。
 */
export function GallerySound({
  puzzle,
  score,
  playback,
}: {
  puzzle: Puzzle;
  score: SoundScore;
  playback: Playback;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportTarget | null>(null);
  const [error, setError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const isCurrent = playback.activeId === puzzle.id;
  const isPlaying = isCurrent && playback.state === "playing";
  const isPaused = isCurrent && playback.state === "paused";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const onExport = async (target: ExportTarget) => {
    setMenuOpen(false);
    setExporting(target);
    setError("");
    try {
      const blob = await renderScoreWav(score, target);
      const seconds = Math.round(actualExportSeconds(score, target));
      downloadWav(blob, `gejian-${puzzle.id}-${seconds}s.wav`);
    } catch {
      setError("当前浏览器不支持离线渲染音频。");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="gallery-sound">
      <div className="gallery-sound-row">
        {isCurrent && (
          <button
            className="gallery-listen"
            onClick={() => (isPlaying ? playback.pause() : playback.stop())}
            title={isPlaying ? "暂停" : "停止"}
          >
            {isPlaying ? <Pause size={14} /> : <Square size={12} />}
          </button>
        )}
        <button
          className="gallery-listen primary-listen"
          onClick={() => playback.play(puzzle.id, score)}
          disabled={playback.state === "unavailable"}
          title="回听已保存的作品"
        >
          {isPaused ? <Play size={14} /> : <AudioIcon active={isPlaying} />}
          {isPlaying ? "演奏中" : isPaused ? "继续" : "回听"}
        </button>
        <div className="export-wrap" ref={wrapRef}>
          <button
            className="gallery-export"
            aria-label="导出音频"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            disabled={exporting !== null}
          >
            {exporting !== null ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Download size={15} />
            )}
          </button>
          {menuOpen && (
            <div className="export-menu" role="menu">
              <small>导出时长（向上取整到完整小节）</small>
              {EXPORT_DURATIONS.map((target) => (
                <button
                  key={target}
                  role="menuitem"
                  onClick={() => onExport(target)}
                  disabled={exporting !== null}
                >
                  约 {Math.round(actualExportSeconds(score, target))} 秒
                  <span>目标 {target}s</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {(exporting !== null || error) && (
        <p className={`gallery-sound-note ${error ? "warn" : ""}`}>
          {error || `正在离线渲染 ${exporting} 秒音频，请稍候…`}
        </p>
      )}
    </div>
  );
}

function AudioIcon({ active }: { active: boolean }) {
  return (
    <span className={`eq-icon ${active ? "active" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
