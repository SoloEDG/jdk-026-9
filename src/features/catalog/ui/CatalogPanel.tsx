import { useState } from "react";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import type { GameDocument } from "../../../shared/types";
import { puzzles } from "../model/puzzles";
import { filterPuzzles } from "../lib/filter";
import { PuzzleCard } from "./PuzzleCard";
export function CatalogPanel({
  document,
  onOpen,
}: {
  document: GameDocument;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("全部");
  const visible = filterPuzzles(puzzles, query, level);
  return (
    <aside className="catalog panel">
      <div className="section-top">
        <span className="eyebrow">THE PUZZLE LIBRARY</span>
        <SlidersHorizontal size={15} />
      </div>
      <h2>下一幅，是什么？</h2>
      <p className="muted">让数字带你发现藏起来的小美好。</p>
      <label className="search">
        <Search size={16} />
        <input
          aria-label="搜索题库"
          placeholder="搜索主题、尺寸"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="filter-tabs">
        {["全部", "入门", "进阶", "挑战"].map((l) => (
          <button
            key={l}
            className={level === l ? "active" : ""}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="library-count">
        精选题库 <span>{visible.length.toString().padStart(2, "0")}</span>
      </div>
      <div className="puzzle-list">
        {visible.map((p) => (
          <PuzzleCard
            key={p.id}
            puzzle={p}
            session={document.sessions[p.id]}
            selected={document.activeId === p.id}
            onOpen={() => onOpen(p.id)}
          />
        ))}
        {!visible.length && (
          <p className="muted">没有找到图案，试试其他关键词。</p>
        )}
      </div>
      <div className="library-note">
        <span>慢慢来，每一格都算数。</span>
        <ArrowUpRight size={17} />
        <p>
          未完成的进度会留在这里，
          <br />
          随时回来接着探索。
        </p>
      </div>
    </aside>
  );
}
