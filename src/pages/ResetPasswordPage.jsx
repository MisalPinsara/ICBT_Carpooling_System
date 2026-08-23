import { useState } from "react";
import { Mail } from "lucide-react";
import { Field } from "../components/Field";
import { hasErrors, validateResetForm } from "../utils/validation";

export function ResetPasswordPage({ onLogin }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "" });

  const sendReset = () => {
    const validation = validateResetForm(email);
    setFieldErrors(validation);
    if (hasErrors(validation)) return;
    setSent(true);
  };

  return (
    <main className="reset-layout">
      <section className="reset-card">
        <h2>Reset your password</h2>
        <p>Enter your email to receive a reset link.</p>
        <Field
          label="Email"
          icon={<Mail size={23} />}
          value={email}
          placeholder="Enter your email"
          error={fieldErrors.email}
          onChange={(value) => {
            setEmail(value);
            setSent(false);
            setFieldErrors({ email: "" });
          }}
        />
        {sent && <p className="form-success">Reset link request saved.</p>}
        <button className="primary-button" type="button" onClick={sendReset}>Send reset link</button>
        <button className="link-button back-link" type="button" onClick={onLogin}>← Back to Login</button>
      </section>
    </main>
  );
}
