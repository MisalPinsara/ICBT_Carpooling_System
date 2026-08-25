import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ValidationMessage } from "./ValidationMessage";

export function Field({ label, value = "", placeholder, type = "text", icon, onChange, iconRight, suffix, disabled, error, maxLength, inputMode, pattern }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="field">
      <span>{label}</span>
      <div className={`input-wrap ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}>
        {!iconRight && icon}
        <input
          type={inputType}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          aria-invalid={error ? "true" : "false"}
          onChange={(event) => onChange(event.target.value)}
        />
        {iconRight && icon}
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {suffix && <em>{suffix}</em>}
      </div>
      {error && <ValidationMessage>{error}</ValidationMessage>}
    </label>
  );
}