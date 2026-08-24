export default function ScoreBadge({ score, category, size = "md" }) {
  const s = Number(score) || 0;
  let colorClass = "text-signal border-signal/40 bg-signal/10";
  if (s >= 75) colorClass = "text-crimson border-crimson/40 bg-crimson/10";
  else if (s >= 50) colorClass = "text-amber border-amber/40 bg-amber/10";
  else if (s >= 25) colorClass = "text-amber border-amber/30 bg-amber/5";

  const sizeClass = size === "lg" ? "text-2xl px-4 py-2" : "text-xs px-2.5 py-1";

  return (
    <div className={`inline-flex items-center gap-2 rounded border font-bold ${colorClass} ${sizeClass}`}>
      <span>{s.toFixed(0)}</span>
      {category && <span className="opacity-70 font-normal uppercase tracking-wide text-[0.7em]">{category.replace(/_/g, " ")}</span>}
    </div>
  );
}
