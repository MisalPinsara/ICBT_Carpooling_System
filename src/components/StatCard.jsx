export function StatCard({ value, label, tone }) {
  return (
    <article className="stat-card">
      <strong className={tone}>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
