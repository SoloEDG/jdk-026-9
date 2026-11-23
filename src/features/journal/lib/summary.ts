import type { SolveRecord } from "../../../shared/types";
export function recordSummary(records: SolveRecord[]) {
  return {
    solves: records.length,
    minutes: Math.floor(
      records.reduce((total, r) => total + r.seconds, 0) / 60,
    ),
    unassisted: records.filter((r) => r.hints === 0).length,
  };
}
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}分${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}秒`;
}
