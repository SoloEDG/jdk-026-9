import { Lightbulb, ScanLine, ArrowUpRight, Sparkles } from "lucide-react";
import type { Puzzle, Session } from "../../../shared/types";
import { HINT_LIMIT } from "../model/hints";
import { inspect } from "../lib/inspect";
import { RuleGuide } from "./RuleGuide";
export function AssistPanel({
  puzzle,
  session,
  message,
  onHint,
  onCheck,
}: {
  puzzle: Puzzle;
  session: Session;
  message: string;
  onHint: () => void;
  onCheck: () => void;
}) {
  const stats = inspect(puzzle, session);
  return (
    <aside className="assist">
      <section className="panel helper">
        <span className="eyebrow">A GENTLE NUDGE</span>
        <h2>换个思路看看</h2>
        <p className="muted">卡住也没关系，给灵感一点空间。</p>
        <button
          className="hint-button"
          onClick={onHint}
          disabled={session.hints >= HINT_LIMIT || session.solved}
        >
          <Lightbulb size={18} />
          <span>给我一点提示</span>
          <span className="hint-count">
            {HINT_LIMIT - session.hints} / {HINT_LIMIT}
          </span>
        </button>
        <p className="hint-note">每次只揭示一格，不替你完成整幅图。</p>
        <button
          className="check-button"
          onClick={onCheck}
          disabled={session.solved}
        >
          <ScanLine size={17} />
          检查当前标记
          <ArrowUpRight size={16} />
        </button>
        <div className="assist-message" role="status">
          {message || "相信你的推理，也可以随时检查。"}
        </div>
        <div className="assist-stats">
          <div>
            <strong>{stats.filled}</strong>
            <span>已填涂</span>
          </div>
          <div>
            <strong>{stats.crossed}</strong>
            <span>已标空</span>
          </div>
          <div>
            <strong>{session.hints}</strong>
            <span>已用提示</span>
          </div>
        </div>
        <RuleGuide />
      </section>
      <section className="quiet-card">
        <Sparkles size={21} />
        <span>小小的专注时刻</span>
        <p>
          世界很大，
          <br />
          先解开眼前这一格。
        </p>
        <div className="quiet-grid">
          {[0, 1, 0, 1, 1, 1, 0, 1, 0].map((v, i) => (
            <span className={v ? "ink" : ""} key={i} />
          ))}
        </div>
      </section>
    </aside>
  );
}
