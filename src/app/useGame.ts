import { useEffect, useReducer, useState, useRef } from "react";
import { findPuzzle, puzzles } from "../features/catalog";
import { inspect, nextHint } from "../features/assist";
import { loadDocument, saveDocument } from "../features/journal";
import { transition } from "./reducer";
export function useGame() {
  const [initial] = useState(() => loadDocument(puzzles));
  const [document, dispatch] = useReducer(
    (d: typeof initial.document, a: Parameters<typeof transition>[1]) =>
      transition(d, a, puzzles),
    initial.document,
  );
  const [message, setMessage] = useState(initial.warning);
  const [saveState, setSaveState] = useState(
    initial.warning ? "手动保存" : "进度已保存",
  );
  const allowSave = useRef(!initial.warning);
  const puzzle = findPuzzle(document.activeId);
  const session = document.sessions[puzzle.id];
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (globalThis.document.visibilityState === "visible")
        dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!allowSave.current) return;
    const timer = setTimeout(
      () =>
        setSaveState(
          saveDocument(document) ? "进度已保存" : "保存失败 · 点击重试",
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [document]);
  const save = () => {
    allowSave.current = true;
    setSaveState(saveDocument(document) ? "进度已保存" : "保存失败 · 点击重试");
  };
  const hint = () => {
    const hint = nextHint(puzzle, session);
    if (hint) {
      dispatch({ type: "hint", ...hint });
      setMessage(
        `已揭示第 ${Math.floor(hint.index / puzzle.size) + 1} 行、第 ${(hint.index % puzzle.size) + 1} 列的一格。`,
      );
    } else setMessage("本题提示额度已用完，试试检查当前标记。");
  };
  const check = () => {
    const { errors } = inspect(puzzle, session);
    dispatch({ type: "check" });
    setMessage(
      errors
        ? `目前有 ${errors} 处标记与答案不符。检查不会直接揭示位置。`
        : "已填写的标记都正确，继续你的发现吧。",
    );
  };
  return {
    document,
    puzzle,
    session,
    message,
    saveState,
    dispatch,
    save,
    hint,
    check,
    clearMessage: () => setMessage(""),
  };
}
