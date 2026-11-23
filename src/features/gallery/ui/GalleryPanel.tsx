import { Download, LockKeyhole, Flower2 } from "lucide-react";
import type { GameDocument, Puzzle } from "../../../shared/types";
import { unlockedArt } from "../lib/artwork";
import { downloadArtwork } from "../model/exportArt";
import { Artwork } from "./Artwork";
export function GalleryPanel({
  document,
  puzzles,
  onOpen,
}: {
  document: GameDocument;
  puzzles: Puzzle[];
  onOpen: (id: string) => void;
}) {
  const arts = unlockedArt(puzzles, document);
  return (
    <section className="gallery panel">
      <span className="eyebrow">LITTLE THINGS, COLLECTED</span>
      <h1>把发现，收藏起来。</h1>
      <p className="muted">
        解开图案，遇见它真正的模样。你的每一份专注都在这里。
      </p>
      <div className="gallery-grid">
        {puzzles.map((p) => {
          const unlocked = arts.includes(p);
          return (
            <article
              className={`art-card ${unlocked ? "unlocked" : ""}`}
              key={p.id}
            >
              {unlocked ? (
                <Artwork puzzle={p} />
              ) : (
                <div className="locked-art">
                  <LockKeyhole size={23} />
                  <span>等待揭晓</span>
                </div>
              )}
              <div className="art-caption">
                <div>
                  <strong>{unlocked ? p.title : "未命名的惊喜"}</strong>
                  <small>
                    {p.collection} · {p.size} × {p.size}
                  </small>
                </div>
                {unlocked ? (
                  <button
                    aria-label={`下载${p.title}`}
                    onClick={() => downloadArtwork(p)}
                  >
                    <Download size={18} />
                  </button>
                ) : (
                  <button onClick={() => onOpen(p.id)}>去解谜</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="gallery-caption">
        <Flower2 size={16} /> 已收藏 {arts.length} / {puzzles.length} 幅小小美好
      </p>
    </section>
  );
}
