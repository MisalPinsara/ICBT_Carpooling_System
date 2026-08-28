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
  const [flash, setFlash] = useState("");
  const initials = `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`;

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const update = (key, value) => {
    const nextValue = key === "phoneNumber" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((current) => ({ ...current, [key]: nextValue }));
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

  async function savePassword(event) {
    event.preventDefault();
    setPwdError("");
    setPwdFieldErrors({});

    const errors = {};
    if (!pwdForm.currentPassword.trim()) errors.currentPassword = "Current password is required.";
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters.";
    if (pwdForm.confirmPassword !== pwdForm.newPassword) errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length) {
      setPwdFieldErrors(errors);
      return;
    }

    setPwdSubmitting(true);
    try {
      await api.changePassword(pwdForm);
      setShowPasswordModal(false);
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setFlash("Password updated successfully.");
    } catch (err) {
      setPwdError(err.message || "Failed to update password.");
      setPwdFieldErrors(err.details || {});
    } finally {
      setPwdSubmitting(false);
    }
  }

  return (
    <AppShell {...props}>
      {flash && <div className="top-alert" role="status">{flash}</div>}
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
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="secondary-button small" type="button" onClick={() => setShowPasswordModal(true)}>Change Password</button>
            </div>
          </div>
        </div>
        <Field label="First Name" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => update("firstName", value)} />
        <Field label="Last Name" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => update("lastName", value)} />
        <Field label="Email" value={form.email} onChange={() => {}} suffix="Account email" disabled />
        <Field label="Phone Number" value={form.phoneNumber} error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
        {error && <p className="form-error">{error}</p>}
        <div className="edit-actions">
          <button className="secondary-button small" type="button" onClick={() => props.setView("profile")}>Cancel</button>
          <button className="primary-button small" type="submit">Save Changes</button>
        </div>
      </form>

      {showPasswordModal && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-pwd-modal-title" onSubmit={savePassword}>
            <div className="modal-heading">
              <div>
                <h2 id="edit-pwd-modal-title">Change Password</h2>
                <p>Ensure your account remains secure with a strong password.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowPasswordModal(false)} aria-label="Close">&times;</button>
            </div>
            <Field
              label="Current Password"
              type="password"
              value={pwdForm.currentPassword}
              error={pwdFieldErrors.currentPassword}
              onChange={(value) => {
                setPwdForm((c) => ({ ...c, currentPassword: value }));
                setPwdError("");
                setPwdFieldErrors((c) => ({ ...c, currentPassword: "" }));
              }}
            />
            <Field
              label="New Password"
              type="password"
              value={pwdForm.newPassword}
              error={pwdFieldErrors.newPassword}
              onChange={(value) => {
                setPwdForm((c) => ({ ...c, newPassword: value }));
                setPwdError("");
                setPwdFieldErrors((c) => ({ ...c, newPassword: "" }));
              }}
            />
            <Field
              label="Confirm New Password"
              type="password"
              value={pwdForm.confirmPassword}
              error={pwdFieldErrors.confirmPassword}
              onChange={(value) => {
                setPwdForm((c) => ({ ...c, confirmPassword: value }));
                setPwdError("");
                setPwdFieldErrors((c) => ({ ...c, confirmPassword: "" }));
              }}
            />
            {pwdError && <p className="validation-message" style={{ marginBottom: "1rem" }}>{pwdError}</p>}
            <div className="edit-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button className="secondary-button small" type="button" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="primary-button small" type="submit" disabled={pwdSubmitting}>
                {pwdSubmitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

