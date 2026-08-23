export function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@icbt\.lk$/i.test(email.trim());
}

export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

export function validateRegistration(payload) {
  const errors = {};
  if (!payload.firstName?.trim()) errors.firstName = "First name is required.";
  if (!payload.lastName?.trim()) errors.lastName = "Last name is required.";
  if (!validateEmail(payload.email)) errors.email = "A valid email is required.";
  if (!payload.phoneNumber?.trim()) errors.phoneNumber = "Phone number is required.";
  if (!validatePassword(payload.password)) errors.password = "Password must be at least 8 characters.";
  if (payload.password !== payload.confirmPassword) errors.confirmPassword = "Passwords must match.";
  return errors;
}

export function validateProfileUpdate(payload) {
  const errors = {};
  if (!payload.firstName?.trim()) errors.firstName = "First name is required.";
  if (!payload.lastName?.trim()) errors.lastName = "Last name is required.";
  if (!payload.phoneNumber?.trim()) errors.phoneNumber = "Phone number is required.";
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
