import { test } from "node:test";
import assert from "node:assert/strict";
import { puzzles } from "../src/features/catalog/model/puzzles";
import { newDocument } from "../src/shared/document";
import { transition } from "../src/app/reducer";
import {
  DEFAULT_ARRANGEMENT,
  createScore,
  marksToPattern,
  normalizeArrangement,
  parseScore,
} from "../src/features/sound/model/arrangement";
import {
  midiToFrequency,
  rowToMidi,
  SCALES,
} from "../src/features/sound/model/scales";
import {
  barsCovering,
  createPlate,
  eventsAtStep,
  loopDuration,
  nextBarBoundary,
  plateFromScore,
  shouldSwapPlate,
} from "../src/features/sound/model/score";
import {
  loadDocument,
  saveDocument,
} from "../src/features/journal/lib/storage";
import type { Mark } from "../src/shared/types";

const size = 5;
// 第 0 列的第 0、2、4 行已填（同列成和弦）；第 1 列首格标空；其余未知。
const filled: Mark[] = (() => {
  const grid: Mark[] = Array<Mark>(size * size).fill("unknown");
  grid[0] = "filled";
  grid[2 * size] = "filled";
  grid[4 * size] = "filled";
  grid[1] = "cross";
  return grid;
})();

test("行列映射：行决定音高且顶行最高，列决定节拍，标空只作休止", () => {
  const plate = createPlate(marksToPattern(filled), DEFAULT_ARRANGEMENT);
  assert.equal(plate.barSteps, size);
  // 顶行音高高于底行
  const top = rowToMidi(0, size, "pentatonic", 3);
  const bottom = rowToMidi(size - 1, size, "pentatonic", 3);
  assert.ok(top > bottom);
  // 频率随 MIDI 单调递增
  assert.ok(midiToFrequency(top) > midiToFrequency(bottom));
  // 第 0 拍（第 0 列）：第 0、2、4 行有已填格 -> 三个音同时发声
  const beat0 = eventsAtStep(plate, 0);
  assert.deepEqual(
    beat0.map((e) => e.row).sort((a, b) => a - b),
    [0, 2, 4],
  );
  // 第 1 列只有标空（cross），不出声 -> 休止拍
  assert.equal(eventsAtStep(plate, 1).length, 0);
  // 未知格同样休止
  assert.equal(eventsAtStep(plate, 3).length, 0);
  // 所有音阶度数都有效，且大调音阶包含 7 个度数
  assert.equal(SCALES.major.intervals.length, 7);
});

test("行数超过音阶度数时跨八度循环，音高仍然互不冲突地递增", () => {
  const big = 15;
  const previous: number[] = [];
  for (let row = big - 1; row >= 0; row--) {
    const midi = rowToMidi(row, big, "pentatonic", 3);
    if (previous.length) assert.ok(midi > previous.at(-1)!);
    previous.push(midi);
  }
  // 底行到顶行至少跨越两个八度
  assert.ok(previous.at(-1)! - previous[0] >= 24);
});

test("小节边界：边界总是 barSteps 的整数倍，循环时长由速度与小节数决定", () => {
  const plate = createPlate(
    Array(size * size).fill(1),
    normalizeArrangement({ tempo: 120, bars: 2 }),
  );
  assert.equal(plate.stepDuration, 0.5);
  assert.equal(plate.barDuration, 2.5);
  assert.equal(loopDuration(plate), 5);
  assert.equal(nextBarBoundary(0, size), size);
  assert.equal(nextBarBoundary(7, size), 10);
  assert.equal(nextBarBoundary(10, size), 15);
  // 覆盖目标时长只取完整小节，不会在乐句中间截断
  assert.equal(barsCovering(plate, 8), 4);
  assert.equal(barsCovering(plate, 1), 2);
});

test("演奏中的修改只在小节边界整体生效，小节内部绝不换谱", () => {
  const barSteps = 5;
  // 模拟一次完整循环：第 3 拍时玩家落了一笔，新谱盘挂起等待。
  const schedule: string[] = [];
  let current = "old";
  let pending: string | null = null;
  for (let step = 0; step < barSteps * 2; step++) {
    if (step === 3) pending = "new";
    if (shouldSwapPlate(step, barSteps, pending !== null)) {
      current = pending;
      pending = null;
    }
    schedule.push(current);
  }
  // 第一小节（0-4 拍）全程旧谱，第二小节（5-9 拍）全程新谱
  assert.deepEqual(schedule, [
    "old",
    "old",
    "old",
    "old",
    "old",
    "new",
    "new",
    "new",
    "new",
    "new",
  ]);
  // 没有挂起谱盘时任何拍位都不替换
  assert.equal(shouldSwapPlate(0, barSteps, false), false);
  assert.equal(shouldSwapPlate(5, barSteps, false), false);
  // 非边界拍位即使有挂起也不替换
  assert.equal(shouldSwapPlate(3, barSteps, true), false);
});

test("保存的 SoundScore 是不可变快照，之后的棋盘修改不影响谱面", () => {
  const marks: Mark[] = Array(25).fill("unknown");
  marks[0] = "filled";
  const score = createScore(marks, DEFAULT_ARRANGEMENT);
  const plateA = plateFromScore(score);
  marks[0] = "unknown";
  marks[1] = "filled";
  const plateB = plateFromScore(score);
  assert.deepEqual(plateA.pattern, plateB.pattern);
  assert.equal(plateB.pattern[0], 1);
  assert.equal(plateB.pattern[1], 0);
});

test("parseScore 拒绝结构损坏或尺寸不符的存档", () => {
  const good = createScore(Array<Mark>(25).fill("filled"), DEFAULT_ARRANGEMENT);
  assert.equal(parseScore(good, 5)?.version, 1);
  assert.equal(parseScore(null, 5), null);
  assert.equal(parseScore({ ...good, version: 2 }, 5), null);
  assert.equal(parseScore({ ...good, pattern: [1, 0] }, 5), null);
  assert.equal(
    parseScore({ ...good, pattern: Array(25).fill(2) }, 5),
    null,
  );
  assert.equal(
    parseScore(
      { ...good, arrangement: { ...good.arrangement, scale: "bogus" } },
      5,
    ),
    null,
  );
  // 越界参数会被规范化回安全区间
  const repaired = parseScore(
    {
      ...good,
      arrangement: { ...good.arrangement, tempo: 999, bars: -3, baseOctave: 99 },
    },
    5,
  );
  assert.equal(repaired?.arrangement.tempo, 180);
  assert.equal(repaired?.arrangement.bars, 1);
  assert.equal(repaired?.arrangement.baseOctave, 4);
});

test("reducer：声音编排随题目保存、清空，重新开始棋盘不会丢失作品", () => {
  const p = puzzles[1];
  let d = newDocument(p);
  const marks = d.sessions[p.id].marks.slice() as Mark[];
  marks[0] = "filled";
  d = transition(d, { type: "mark", index: 0, mark: "filled" }, puzzles);
  const score = createScore(d.sessions[p.id].marks, DEFAULT_ARRANGEMENT);
  d = transition(d, { type: "sound-save", score }, puzzles);
  assert.deepEqual(d.sessions[p.id].sound?.pattern, score.pattern);
  // 重置棋盘后声音作品仍保留
  d = transition(d, { type: "reset" }, puzzles);
  assert.equal(d.sessions[p.id].marks[0], "unknown");
  assert.equal(d.sessions[p.id].sound?.pattern[0], 1);
  // 清空
  d = transition(d, { type: "sound-clear" }, puzzles);
  assert.equal(d.sessions[p.id].sound, null);
  // 另一道题的编排相互隔离
  d = transition(
    d,
    { type: "sound-save", score: createScore(marks, DEFAULT_ARRANGEMENT) },
    puzzles,
  );
  const otherId = puzzles[0].id;
  d = transition(d, { type: "open", id: otherId }, puzzles);
  assert.equal(d.sessions[otherId].sound, null);
});

test("存档往返保留已确认编排，损坏声音字段被安全忽略", () => {
  let stored: string | null = null;
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: () => stored,
      setItem: (_: string, value: string) => {
        stored = value;
      },
    },
    configurable: true,
  });
  const p = puzzles[0];
  let d = newDocument(p);
  d = transition(d, { type: "mark", index: 2, mark: "filled" }, puzzles);
  const score = createScore(d.sessions[p.id].marks, {
    ...DEFAULT_ARRANGEMENT,
    tempo: 132,
    voice: "pad",
  });
  d = transition(d, { type: "sound-save", score }, puzzles);
  assert.ok(saveDocument(d));
  const restored = loadDocument(puzzles);
  assert.equal(restored.warning, "");
  assert.equal(restored.document.sessions[p.id].sound?.arrangement.tempo, 132);
  assert.equal(restored.document.sessions[p.id].sound?.pattern[2], 1);

  // 手动破坏声音字段，其余进度仍可读取
  const raw = JSON.parse(stored!);
  raw.sessions[p.id].sound = { broken: true };
  stored = JSON.stringify(raw);
  const recovered = loadDocument(puzzles);
  assert.equal(recovered.warning, "");
  assert.equal(recovered.document.sessions[p.id].sound, null);
  assert.equal(recovered.document.sessions[p.id].marks[2], "filled");
});
