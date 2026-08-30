export function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@icbt\.lk$/i.test(email.trim());
}

export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

export function validatePhoneNumber(phoneNumber) {
  if (typeof phoneNumber !== "string" || !phoneNumber.trim()) return "Phone number is required.";
  const trimmedPhoneNumber = phoneNumber.trim();
  if (!/^\d+$/.test(trimmedPhoneNumber)) return "Phone number can only include numbers.";
  if (trimmedPhoneNumber.length > 10) return "Phone number must be 10 digits or fewer.";
  return "";
}

export function validateRegistration(payload) {
  const errors = {};
  if (!payload.firstName?.trim()) errors.firstName = "First name is required.";
  if (!payload.lastName?.trim()) errors.lastName = "Last name is required.";
  if (!validateEmail(payload.email)) errors.email = "A valid email is required.";
  const phoneError = validatePhoneNumber(payload.phoneNumber);
  if (phoneError) errors.phoneNumber = phoneError;
  if (!validatePassword(payload.password)) errors.password = "Password must be at least 8 characters.";
  if (payload.password !== payload.confirmPassword) errors.confirmPassword = "Passwords must match.";
  return errors;
}

export function validateProfileUpdate(payload) {
  const errors = {};
  if (!payload.firstName?.trim()) errors.firstName = "First name is required.";
  if (!payload.lastName?.trim()) errors.lastName = "Last name is required.";
  const phoneError = validatePhoneNumber(payload.phoneNumber);
  if (phoneError) errors.phoneNumber = phoneError;
  return errors;
}

export function validateRideOffer(payload) {
  const errors = {};
  if (!payload.origin?.trim()) errors.origin = "Origin is required.";
  if (!payload.destination?.trim()) errors.destination = "Destination is required.";
  if (!payload.departureDate?.trim()) errors.departureDate = "Departure date is required.";
  if (!payload.departureTime?.trim()) errors.departureTime = "Departure time is required.";
  if (!payload.timeWindow?.trim()) errors.timeWindow = "Time window is required.";
  if (!Number.isInteger(Number(payload.availableSeats)) || Number(payload.availableSeats) <= 0) {
    errors.availableSeats = "Available seats must be greater than zero.";
  }
  return errors;
}

// Sprint 2 — validates that a join-request body has a non-empty rideOfferId.
export function validateJoinRequest(payload) {
  const errors = {};
  if (!payload.rideOfferId || typeof payload.rideOfferId !== "string" || !payload.rideOfferId.trim()) {
    errors.rideOfferId = "Ride offer ID is required.";
  }
  return errors;
}

// Sprint 2 — builds a MongoDB filter from search query params.
// Normalises strings (trim + case-insensitive partial match) per UT-S2-01.
export function buildSearchQuery(params) {
  const filter = {};
  if (params.origin && params.origin.trim()) {
    filter.origin = { $regex: params.origin.trim(), $options: "i" };
  }
  if (params.destination && params.destination.trim()) {
    filter.destination = { $regex: params.destination.trim(), $options: "i" };
  }
  if (params.date && params.date.trim()) {
    filter.departureDate = { $regex: params.date.trim(), $options: "i" };
  }
  if (params.timeWindow && params.timeWindow.trim()) {
    filter.timeWindow = { $regex: params.timeWindow.trim(), $options: "i" };
  }
  return filter;
}

// Sprint 3 — validates decision payload for a join-request.
export function validateDecision(payload) {
  const errors = {};
  const status = (payload?.status || payload?.decision || payload?.action || "").trim();
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  if (!["Accepted", "Rejected", "Cancelled"].includes(normalized)) {
    errors.status = "Decision status must be 'Accepted', 'Rejected', or 'Cancelled'.";
  }
  return errors;
}

// Sprint 4 — validates password change request.
export function validatePasswordChange(payload = {}) {
  const currentPassword = payload.currentPassword || payload.oldPassword || payload.current_password || "";
  const newPassword = payload.newPassword || payload.new_password || payload.password || "";
  const confirmPassword = payload.confirmPassword || payload.confirmNewPassword || payload.newPasswordConfirm || payload.confirm_password || payload.passwordConfirmation || "";

  const errors = {};
  if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
    errors.currentPassword = "Current password is required.";
  }
  if (!validatePassword(newPassword)) {
    errors.newPassword = "New password must be at least 8 characters.";
  }
  if (confirmPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = "New password confirmation does not match.";
  }
  return errors;
}


// Sprint 4 — validates ride offer edit.
export function validateRideOfferEdit(payload = {}) {
  const errors = {};
  if (!payload.origin?.trim()) errors.origin = "Origin is required.";
  if (!payload.destination?.trim()) errors.destination = "Destination is required.";
  if (!payload.departureDate?.trim()) errors.departureDate = "Departure date is required.";
  if (!payload.departureTime?.trim()) errors.departureTime = "Departure time is required.";
  if (!payload.timeWindow?.trim()) errors.timeWindow = "Time window is required.";
  if (payload.availableSeats === undefined || !Number.isInteger(Number(payload.availableSeats)) || Number(payload.availableSeats) < 0) {
    errors.availableSeats = "Available seats must be a non-negative integer.";
  }
  return errors;
}

// Sprint 4 — validates message sending.
export function validateMessage(payload = {}) {
  const errors = {};
  if (!payload.content || typeof payload.content !== "string" || !payload.content.trim()) {
    errors.content = "Message content cannot be empty.";
  }
  if (!payload.recipientUserId || typeof payload.recipientUserId !== "string" || !payload.recipientUserId.trim()) {
    errors.recipientUserId = "Recipient user ID is required.";
  }
  if (!payload.rideOfferId || typeof payload.rideOfferId !== "string" || !payload.rideOfferId.trim()) {
    errors.rideOfferId = "Ride offer ID is required.";
  }
  return errors;
}


