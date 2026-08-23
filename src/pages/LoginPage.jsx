import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { BrandPanel } from "../components/BrandPanel";
import { Field } from "../components/Field";
import { ValidationMessage } from "../components/ValidationMessage";
import { api } from "../services/api";
import { hasErrors, validateLogin } from "../utils/validation";

export function LoginPage({ onRegister, onForgot, onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const updateField = (key, value) => {
    if (key === "email") setEmail(value);
    if (key === "password") setPassword(value);
    setError("");
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  async function submit(event) {
    event.preventDefault();
    setError("");
    const validation = validateLogin({ email, password });
    setFieldErrors(validation);
    if (hasErrors(validation)) return;

    try {
      onAuthed(await api.login({ email, password }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-layout">
      <BrandPanel />
      <section className="auth-stage">
        <form className="auth-card login-card" onSubmit={submit}>
          <h2>Welcome back <span aria-hidden="true">👋</span></h2>
          <p>Sign in to your ICBT Carpool account.</p>
          <Field label="Email" icon={<Mail size={23} />} value={email} placeholder="Enter your email" error={fieldErrors.email} onChange={(value) => updateField("email", value)} />
          <Field label="Password" icon={<Lock size={22} />} type="password" value={password} placeholder="••••••••" error={fieldErrors.password} onChange={(value) => updateField("password", value)} />
          <button className="link-button forgot" type="button" onClick={onForgot}>Forgot password?</button>
          {error && (
            <div className="login-error">
              <ValidationMessage>{error}</ValidationMessage>
            </div>
          )}
          <div className="login-actions">
            <button className="primary-button" type="submit">Login</button>
          </div>
          <p className="switch-copy">Don't have an account?</p>
          <button className="link-button strong login-create-link" type="button" onClick={onRegister}>Create an account</button>
        </form>
      </section>
    </main>
  );
}
