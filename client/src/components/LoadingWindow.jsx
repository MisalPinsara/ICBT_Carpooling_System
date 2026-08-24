export function LoadingWindow({ text = "Loading", fullPage = false }) {
  return (
    <div className={`loading-window ${fullPage ? "full-page" : ""}`}>
      <div className="loading-content" role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <span>{text}</span>
      </div>
    </div>
  );
}
