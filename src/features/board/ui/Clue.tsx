export function Clue({
  values,
  done,
  vertical,
}: {
  values: number[];
  done: boolean;
  vertical?: boolean;
}) {
  return (
    <div
      className={`clue ${vertical ? "vertical" : ""} ${done ? "done" : ""}`}
      aria-label={values.join("、") + (done ? " 已满足" : "")}
    >
      {values.map((v, i) => (
        <span key={i}>{v}</span>
      ))}
    </div>
  );
}
