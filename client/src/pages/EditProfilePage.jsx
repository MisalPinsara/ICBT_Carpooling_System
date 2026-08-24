import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { Field } from "../components/Field";
import { api } from "../services/api";
import { hasErrors, validateProfileForm } from "../utils/validation";

export function EditProfilePage(props) {
  const [form, setForm] = useState({
    firstName: props.profile.firstName,
    lastName: props.profile.lastName,
    email: props.user.email,
    phoneNumber: props.profile.phoneNumber,
    homeRoute: props.profile.homeRoute
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const initials = `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`;

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  async function save(event) {
    event.preventDefault();
    setError("");
    const validation = validateProfileForm(form);
    setFieldErrors(validation);
    if (hasErrors(validation)) return;

    try {
      const data = await api.updateProfile(form);
      props.updateAuth(data);
      props.setView("profile");
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details || {});
    }
  }

  return (
    <AppShell {...props}>
      <h1 className="page-title">Edit Profile</h1>
      <section className="intro compact-intro">
        <h2>Personal information</h2>
        <p>Update your personal details and keep your profile information current.</p>
      </section>
      <form className="panel edit-panel" onSubmit={save}>
        <div className="edit-hero">
          <div className="avatar-medium">{initials}</div>
          <div>
            <h2>{form.firstName} {form.lastName}</h2>
            <p>{props.profile.accountType}</p>
            <button className="secondary-button small" type="button">Change photo</button>
          </div>
        </div>
        <Field label="First Name" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => update("firstName", value)} />
        <Field label="Last Name" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => update("lastName", value)} />
        <Field label="Email" value={form.email} onChange={() => {}} suffix="Account email" disabled />
        <Field label="Phone Number" value={form.phoneNumber} error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} />
        {error && <p className="form-error">{error}</p>}
        <div className="edit-actions">
          <button className="secondary-button small" type="button" onClick={() => props.setView("profile")}>Cancel</button>
          <button className="primary-button small" type="submit">Save Changes</button>
        </div>
      </form>
    </AppShell>
  );
}
