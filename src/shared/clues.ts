export function runs(values: readonly number[]): number[] {
  const result: number[] = [];
  let count = 0;
  for (const value of values) {
    if (value) count++;
    else if (count) {
      result.push(count);
      count = 0;
    }
  }
  if (count) result.push(count);
  return result.length ? result : [0];
}
export function lines(size: number, values: readonly number[]): number[][] {
  return [...Array(size * 2)].map((_, line) =>
    [...Array(size)].map(
      (_, i) => values[line < size ? line * size + i : i * size + line - size],
    ),
  );
}
export function clueSet(size: number, solution: readonly number[]): number[][] {
  return lines(size, solution).map(runs);
}
