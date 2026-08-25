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
      setFlash("profile updated successfully");
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details || {});
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
              <button className="secondary-button small" type="button">Change Password</button>
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
                <h2 id="profile-modal-title">Edit profile</h2>
                <p>Update your personal details.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowEdit(false)} aria-label="Close">&times;</button>
            </div>
            <Field label="First Name" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => update("firstName", value)} />
            <Field label="Last Name" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => update("lastName", value)} />
            <Field label="Email" value={form.email} onChange={() => {}} suffix="Account email" disabled />
            <Field label="Phone Number" value={form.phoneNumber} error={fieldErrors.phoneNumber} onChange={(value) => update("phoneNumber", value)} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
            {error && <p className="form-error">{error}</p>}
            <div className="edit-actions">
              <button className="secondary-button small" type="button" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="primary-button small" type="submit">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
