const styles = {
  high: "text-crimson border-crimson/40 bg-crimson/10",
  medium: "text-amber border-amber/40 bg-amber/10",
  low: "text-muted border-line bg-white/5",
};

export default function SeverityTag({ severity }) {
  const cls = styles[severity] || styles.low;
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${cls}`}>
      {severity || "low"}
    </span>
  );
}
