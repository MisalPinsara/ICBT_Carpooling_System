import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Field } from "../components/Field";
import { Info } from "../components/Info";
import { api } from "../services/api";
import { hasErrors, validateProfileForm } from "../utils/validation";

export function ProfilePage(props) {
  const { user, profile } = props;
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`;
  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: user.email,
    phoneNumber: profile.phoneNumber,
    homeRoute: profile.homeRoute
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [flash, setFlash] = useState("");

  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  useEffect(() => {
    if (!flash) return undefined;
    const timeoutId = window.setTimeout(() => setFlash(""), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [flash]);

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
      setShowEdit(false);
      setFlash("Profile updated successfully.");
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
      <section className="intro compact-intro">
        <h2>My Profile</h2>
        <p>View your account and personal information.</p>
      </section>
      <section className="panel profile-panel">
        <div className="profile-hero">
          <div className="avatar-large">{initials}</div>
          <div>
            <h2>{user.name}</h2>
            <p>{profile.accountType}</p>
            <div className="profile-actions">
              <button className="primary-button small" type="button" onClick={() => setShowEdit(true)}>Edit Profile</button>
              <button className="secondary-button small" type="button" onClick={() => setShowPasswordModal(true)}>Change Password</button>
            </div>
          </div>
        </div>
        <hr />
        <div className="profile-data">
          <Info label="First Name" value={profile.firstName} />
          <Info label="Last Name" value={profile.lastName} />
          <Info label="Email" value={user.email} />
          <Info label="Phone Number" value={profile.phoneNumber} />
          <Info label="Student / Staff ID" value={profile.studentStaffId} />
          <Info label="Home Route" value={profile.homeRoute} wide />
        </div>
      </section>

      {showEdit && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onSubmit={save}>
            <div className="modal-heading">
              <div>
                <h2 id="profile-modal-title">Edit Profile</h2>
                <p>Update your personal details.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowEdit(false)} aria-label="Close">&times;</button>
            </div>
            <Field label="First Name" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => update("firstName", value)} />
            <Field label="Last Name" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => update("lastName", value)} />
            <Field label="Email" value={form.email} onChange={() => {}} suffix="Account email" disabled />
            <Field label="Phone Number" value={form.phoneNumber} error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
            {error && <p className="form-error">{error}</p>}
            <div className="edit-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button className="secondary-button small" type="button" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="primary-button small" type="submit">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="pwd-modal-title" onSubmit={savePassword}>
            <div className="modal-heading">
              <div>
                <h2 id="pwd-modal-title">Change Password</h2>
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

