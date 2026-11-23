import {
  AudioLines,
  Pause,
  Play,
  Save,
  Square,
  Trash2,
  VolumeX,
} from "lucide-react";
import type { Puzzle } from "../../../shared/types";
import {
  MAX_BARS,
  MAX_OCTAVE,
  MAX_TEMPO,
  MIN_BARS,
  MIN_OCTAVE,
  MIN_TEMPO,
  VOICE_OPTIONS,
} from "../model/arrangement";
import { SCALE_OPTIONS } from "../model/scales";
import type { SoundCanvasApi } from "./useSoundCanvas";

export function SoundCanvasPanel({
  puzzle,
  sound,
}: {
  puzzle: Puzzle;
  sound: SoundCanvasApi;
}) {
  const playing = sound.state === "playing";
  const paused = sound.state === "paused";
  const unavailable = sound.state === "unavailable";
  const active = playing || paused;

  return (
    <section className="sound-panel panel" aria-label="声音画布">
      <div className="sound-head">
        <div>
          <span className="eyebrow">SOUND CANVAS · 声音画布</span>
          <h2>
            <AudioLines size={18} />
            让这道题有自己的声音
          </h2>
        </div>
        <div className="sound-transport">
          <button
            className="sound-play"
            onClick={sound.toggle}
            disabled={unavailable || sound.filledCount === 0}
            aria-label={playing ? "暂停演奏" : "开始演奏"}
            title={sound.filledCount === 0 ? "先在棋盘上填涂一些格子" : undefined}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? "暂停" : paused ? "继续" : "演奏"}
          </button>
          <button
            className="sound-stop"
            onClick={sound.stop}
            disabled={!active}
            aria-label="停止演奏"
          >
            <Square size={14} />
          </button>
        </div>
      </div>

      <p className="sound-rule">
        行决定音高（越靠上越高），列决定节拍（一次从左到右的扫描是一小节）；
        <strong>已填格</strong>在对应拍位发声，<strong>标空</strong>与未知格只作休止。
        可同时发声的同列格子会组成和弦。
      </p>

      <div className="sound-controls">
        <label className="sound-control">
          <span>音阶</span>
          <select
            value={sound.arrangement.scale}
            onChange={(e) =>
              sound.setArrangement({
                scale: e.target.value as SoundCanvasApi["arrangement"]["scale"],
              })
            }
          >
            {SCALE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sound-control sound-tempo">
          <span>
            速度
            <strong>{sound.arrangement.tempo}</strong>
            <small>BPM</small>
          </span>
          <input
            type="range"
            min={MIN_TEMPO}
            max={MAX_TEMPO}
            step={4}
            value={sound.arrangement.tempo}
            onChange={(e) =>
              sound.setArrangement({ tempo: Number(e.target.value) })
            }
            aria-label="演奏速度"
          />
        </label>

        <label className="sound-control">
          <span>声部</span>
          <select
            value={sound.arrangement.voice}
            onChange={(e) =>
              sound.setArrangement({
                voice: e.target.value as SoundCanvasApi["arrangement"]["voice"],
              })
            }
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} · {v.hint}
              </option>
            ))}
          </select>
        </label>

        <label className="sound-control sound-stepper">
          <span>基础八度</span>
          <div>
            <button
              type="button"
              disabled={sound.arrangement.baseOctave <= MIN_OCTAVE}
              onClick={() =>
                sound.setArrangement({
                  baseOctave: sound.arrangement.baseOctave - 1,
                })
              }
            >
              −
            </button>
            <strong>{sound.arrangement.baseOctave}</strong>
            <button
              type="button"
              disabled={sound.arrangement.baseOctave >= MAX_OCTAVE}
              onClick={() =>
                sound.setArrangement({
                  baseOctave: sound.arrangement.baseOctave + 1,
                })
              }
            >
              +
            </button>
          </div>
        </label>

        <label className="sound-control sound-stepper">
          <span>循环小节</span>
          <div>
            <button
              type="button"
              disabled={sound.arrangement.bars <= MIN_BARS}
              onClick={() =>
                sound.setArrangement({ bars: sound.arrangement.bars - 1 })
              }
            >
              −
            </button>
            <strong>{sound.arrangement.bars}</strong>
            <button
              type="button"
              disabled={sound.arrangement.bars >= MAX_BARS}
              onClick={() =>
                sound.setArrangement({ bars: sound.arrangement.bars + 1 })
              }
            >
              +
            </button>
          </div>
        </label>
      </div>

      <div className="sound-footer">
        <div className="sound-status" role="status">
          {unavailable ? (
            <span className="sound-warn">
              <VolumeX size={14} />
              浏览器未开放音频权限，无法发声；编排仍可调整与保存。
            </span>
          ) : sound.autoPaused ? (
            <span className="sound-warn">
              <Pause size={14} />
              页面曾被挂起，演奏已暂停且不会补播；点「继续」恢复。
            </span>
          ) : active && sound.pending ? (
            <span className="sound-pending">
              <span className="pulse-dot" />
              修改尚未进入演奏，将在下一个小节边界整体生效
            </span>
          ) : active ? (
            <span className="sound-live">
              <span className="pulse-dot live" />
              正在演奏第 {sound.playhead ? sound.playhead.bar + 1 : 1} 小节 ·
              第 {sound.playhead ? sound.playhead.step + 1 : 1} 拍
            </span>
          ) : (
            <span className="sound-idle">
              {sound.filledCount} 个已填格参与演奏，其余为休止
            </span>
          )}
        </div>
        <div className="sound-save-group">
          {sound.savedScore && (
            <button
              className="sound-clear"
              onClick={sound.clearSaved}
              title="删除本题已保存的作品"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            className={`sound-save ${sound.dirty ? "dirty" : ""}`}
            onClick={sound.save}
            disabled={!sound.dirty}
          >
            <Save size={14} />
            {sound.savedScore
              ? sound.dirty
                ? "保存修改到本题"
                : "作品已保存"
              : "保存作品到本题"}
          </button>
        </div>
      </div>

      <p className="sound-hint">
        {puzzle.title} · {puzzle.size}×{puzzle.size} 棋盘即乐谱，
        保存后可在展柜回听并导出音频；导出只读取已确认的编排，不会提前播放未解答案。
      </p>
    </section>
  );
}
