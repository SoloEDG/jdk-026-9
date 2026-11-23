import { Square, X, Eraser, Undo2, RotateCcw } from "lucide-react";
import type { Tool } from "../../../shared/types";
export function BoardToolbar({
  tool,
  onTool,
  onUndo,
  onReset,
  canUndo,
  disabled,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  disabled: boolean;
}) {
  return (
    <div className="board-toolbar">
      <div className="tool-group">
        {(
          [
            { id: "filled", name: "填涂", icon: Square },
            { id: "cross", name: "标空", icon: X },
            { id: "unknown", name: "擦除", icon: Eraser },
          ] as const
        ).map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={tool === id}
            className={tool === id ? "active" : ""}
            onClick={() => onTool(id)}
            disabled={disabled}
          >
            <Icon size={16} />
            {name}
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button
          aria-label="撤销上一步"
          title="撤销上一步"
          onClick={onUndo}
          disabled={!canUndo || disabled}
        >
          <Undo2 size={17} />
        </button>
        <button aria-label="重新开始" title="重新开始" onClick={onReset}>
          <RotateCcw size={17} />
        </button>
      </div>
    </div>
  );
}
