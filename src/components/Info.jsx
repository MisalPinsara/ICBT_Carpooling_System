export function Info({ label, value, wide }) {
  return (
    <div className={wide ? "wide" : ""}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
