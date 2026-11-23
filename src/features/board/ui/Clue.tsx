export function Clue({
  values,
  done,
  vertical,
  active,
}: {
  values: number[];
  done: boolean;
  vertical?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`clue ${vertical ? "vertical" : ""} ${done ? "done" : ""} ${active ? "active-beat" : ""}`}
      aria-label={values.join("、") + (done ? " 已满足" : "")}
    >
      {values.map((v, i) => (
        <span key={i}>{v}</span>
      ))}
    </div>
  );
}
