import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ValidationMessage } from "./ValidationMessage";

export function PickerField({ label, value = "", placeholder, icon, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const displayOptions = useMemo(() => options || [], [options]);

  const selectOption = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="field picker-field">
      <span>{label}</span>
      <div className={`picker-wrap ${open ? "open" : ""} ${error ? "error" : ""}`}>
        <button className="input-wrap picker-trigger" type="button" onClick={() => setOpen((current) => !current)}>
          {icon}
          <span className={value ? "picker-value" : "picker-placeholder"}>{value || placeholder}</span>
          <ChevronDown size={16} />
        </button>
        {open && (
          <div className="picker-menu">
            {displayOptions.map((option) => (
              <button
                className={option === value ? "selected" : ""}
                type="button"
                key={option}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <ValidationMessage>{error}</ValidationMessage>}
    </div>
  );
}
