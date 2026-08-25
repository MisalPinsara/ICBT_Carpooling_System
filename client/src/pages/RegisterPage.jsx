import { useState } from "react";
import { BrandPanel } from "../components/BrandPanel";
import { Field } from "../components/Field";
import { api } from "../services/api";
import { hasErrors, validateRegisterForm } from "../utils/validation";

export function RegisterPage({ onLogin, onAuthed }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingAuth, setPendingAuth] = useState(null);

  const update = (key, value) => {
    const nextValue = key === "phoneNumber" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((current) => ({ ...current, [key]: nextValue }));
    setError("");
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  async function submit(event) {
    event.preventDefault();
    setError("");
    const validation = validateRegisterForm(form);
    setFieldErrors(validation);
    if (hasErrors(validation)) return;

    try {
      setPendingAuth(await api.register(form));
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details || {});
    }
  }

  return (
    <main className="auth-layout register-layout">
      <BrandPanel mode="register" />
      <section className="auth-stage register-stage">
        <form className="auth-card register-card" onSubmit={submit}>
          <h2>Create your account</h2>
          <p>Register for ICBT Carpool using your personal details.</p>
          <Field label="First Name" value={form.firstName} placeholder="Enter your first name" error={fieldErrors.firstName} onChange={(value) => update("firstName", value)} />
          <Field label="Last Name" value={form.lastName} placeholder="Enter your last name" error={fieldErrors.lastName} onChange={(value) => update("lastName", value)} />
          <Field label="Email" value={form.email} placeholder="Enter your email" error={fieldErrors.email} onChange={(value) => update("email", value)} />
          <Field label="Phone Number" value={form.phoneNumber} placeholder="Enter your phone number" error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
          <Field label="Password" type="password" value={form.password} placeholder="Create a password" error={fieldErrors.password} onChange={(value) => update("password", value)} />
          <Field label="Confirm Password" type="password" value={form.confirmPassword} placeholder="Confirm your password" error={fieldErrors.confirmPassword} onChange={(value) => update("confirmPassword", value)} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">Create Account</button>
          <p className="switch-copy">Already have an account?</p>
          <button className="link-button strong login-create-link" type="button" onClick={onLogin}>Login</button>
        </form>
        {pendingAuth && (
          <div className="modal-backdrop success-modal-backdrop" role="presentation">
            <section className="success-account-modal" role="dialog" aria-modal="true" aria-labelledby="account-created-title">
              <h2 id="account-created-title">successfully created your ICBT Carpooling account</h2>
              <button className="primary-button" type="button" onClick={() => onAuthed(pendingAuth)}>Continue to dashboard</button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}