import { ValidationMessage } from "./ValidationMessage";

export function Field({ label, value = "", placeholder, type = "text", icon, onChange, iconRight, suffix, disabled, error }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className={`input-wrap ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}>
        {!iconRight && icon}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? "true" : "false"}
          onChange={(event) => onChange(event.target.value)}
        />
        {iconRight && icon}
        {suffix && <em>{suffix}</em>}
      </div>
      {error && <ValidationMessage>{error}</ValidationMessage>}
    </label>
  );
}
