import { useState } from "react";
import { Clock3, CheckCircle2, MousePointer2 } from "lucide-react";
import { clueSet } from "../../../shared/clues";
import type { Puzzle, Session, Tool } from "../../../shared/types";
import { completion } from "../../../shared/document";
import { lineStatuses } from "../lib/lineStatus";
import { BoardToolbar } from "./BoardToolbar";
import { Clue } from "./Clue";
export function BoardPanel({
  puzzle,
  session,
  onMark,
  onUndo,
  onReset,
}: {
  puzzle: Puzzle;
  session: Session;
  onMark: (i: number, t: Tool) => void;
  onUndo: () => void;
  onReset: () => void;
}) {
  const [tool, setTool] = useState<Tool>("filled");
  const clues = clueSet(puzzle.size, puzzle.solution);
  const statuses = lineStatuses(puzzle, session.marks);
  return (
    <section className="board-panel panel">
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            A LITTLE DISCOVERY · {puzzle.collection}
          </span>
          <h1>
            {session.solved ? puzzle.title : "一格一格，拼出惊喜"}
            <span className="level-tag">{puzzle.level}</span>
          </h1>
        </div>
        <div className="timer">
          <Clock3 size={15} />
          {Math.floor(session.seconds / 60)
            .toString()
            .padStart(2, "0")}
          :{(session.seconds % 60).toString().padStart(2, "0")}
        </div>
      </div>
      <BoardToolbar
        tool={tool}
        onTool={setTool}
        onUndo={onUndo}
        onReset={onReset}
        canUndo={session.moves.length > 0}
        disabled={session.solved}
      />
      <div className="board-stage">
        <div
          className="puzzle-grid"
          style={{
            gridTemplateColumns: `64px repeat(${puzzle.size}, var(--cell))`,
            gridTemplateRows: `64px repeat(${puzzle.size}, var(--cell))`,
          }}
        >
          <div className="grid-corner">
            <span>
              {puzzle.size}×{puzzle.size}
            </span>
            <small>NONOGRAM</small>
          </div>
          {clues.slice(puzzle.size).map((v, i) => (
            <Clue
              key={"c" + i}
              values={v}
              done={statuses[puzzle.size + i]}
              vertical
            />
          ))}
          {Array.from({ length: puzzle.size }, (_, row) => (
            <div className="grid-row" key={row}>
              <Clue values={clues[row]} done={statuses[row]} />
              {Array.from({ length: puzzle.size }, (_, col) => {
                const i = row * puzzle.size + col;
                const mark = session.marks[i];
                return (
                  <button
                    key={col}
                    aria-label={`第${row + 1}行第${col + 1}列 ${mark === "filled" ? "已填" : mark === "cross" ? "标空" : "未知"}`}
                    className={`cell ${mark} ${(col + 1) % 5 === 0 ? "major-right" : ""} ${(row + 1) % 5 === 0 ? "major-bottom" : ""}`}
                    disabled={session.solved}
                    onClick={() =>
                      onMark(i, session.marks[i] === tool ? "unknown" : tool)
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onMark(i, mark === "cross" ? "unknown" : "cross");
                    }}
                  >
                    {mark === "cross" ? "×" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="board-footer">
        <span>
          <MousePointer2 size={14} /> 左键填涂 · 右键标空
        </span>
        <span>
          <span className="status-dot" /> {statuses.filter(Boolean).length} /{" "}
          {puzzle.size * 2} 条线已满足
        </span>
      </div>
      <div className="progress-caption">
        <span>
          {session.solved ? (
            <>
              <CheckCircle2 size={15} />
              图案已揭晓
            </>
          ) : (
            "每一小步，都离答案更近"
          )}
        </span>
        <strong>{completion(session)}% 已标记</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: completion(session) + "%" }} />
      </div>
    </section>
  );
}
