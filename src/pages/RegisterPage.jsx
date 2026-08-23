import { useState } from "react";
import { Eye } from "lucide-react";
import { BrandPanel } from "../components/BrandPanel";
import { Field } from "../components/Field";
import { api } from "../services/api";
import { hasErrors, validateRegisterForm } from "../utils/validation";

export function RegisterPage({ onLogin, onAuthed }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "", confirmPassword: "", role: "Passenger" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
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
      onAuthed(await api.register(form));
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
          <Field label="Phone Number" value={form.phoneNumber} placeholder="Enter your phone number" error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} />
          <Field label="Password" icon={<Eye size={18} />} type="password" value={form.password} placeholder="Create a password" error={fieldErrors.password} onChange={(value) => update("password", value)} iconRight />
          <Field label="Confirm Password" icon={<Eye size={18} />} type="password" value={form.confirmPassword} placeholder="Confirm your password" error={fieldErrors.confirmPassword} onChange={(value) => update("confirmPassword", value)} iconRight />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">Create Account</button>
          <p className="switch-copy">Already have an account?</p>
          <button className="link-button strong login-create-link" type="button" onClick={onLogin}>Login</button>
        </form>
      </section>
    </main>
  );
}
