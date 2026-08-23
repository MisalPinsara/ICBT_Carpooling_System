export function ValidationMessage({ children, className = "" }) {
  return <span className={`field-error validation-message ${className}`.trim()}>{children}</span>;
}
