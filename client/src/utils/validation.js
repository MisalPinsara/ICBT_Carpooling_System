const isIcbtEmail = (value) => /^[^\s@]+@icbt\.lk$/i.test(value.trim());

function required(value, label) {
  return value?.toString().trim() ? "" : `${label} is required.`;
}

function validatePhoneNumber(value) {
  const phoneNumber = value?.toString().trim() || "";
  if (!phoneNumber) return "Phone number is required.";
  if (!/^\d+$/.test(phoneNumber)) return "Phone number can only include numbers.";
  if (phoneNumber.length > 10) return "Phone number must be 10 digits or fewer.";
  return "";
}

export function validateLogin(form) {
  return {
    email: required(form.email, "Email"),
    password: required(form.password, "Password")
  };
}

export function validateRegisterForm(form) {
  const errors = {
    firstName: required(form.firstName, "First name"),
    lastName: required(form.lastName, "Last name"),
    email: required(form.email, "Email"),
    phoneNumber: validatePhoneNumber(form.phoneNumber),
    password: required(form.password, "Password"),
    confirmPassword: required(form.confirmPassword, "Confirm password")
  };

  if (!errors.email && !isIcbtEmail(form.email)) errors.email = "Enter a valid email.";
  if (!errors.password && form.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (!errors.confirmPassword && form.password !== form.confirmPassword) errors.confirmPassword = "Passwords must match.";
  return errors;
}

export function validateResetForm(email) {
  const message = required(email, "Email");
  if (message) return { email: message };
  if (!isIcbtEmail(email)) return { email: "Enter a valid email." };
  return { email: "" };
}

export function validateRideForm(form) {
  const errors = {
    origin: required(form.origin, "Origin"),
    destination: required(form.destination, "Destination"),
    departureDate: required(form.departureDate, "Departure date"),
    departureTime: required(form.departureTime, "Departure time"),
    timeWindow: required(form.timeWindow, "Time window"),
    availableSeats: required(form.availableSeats, "Available seats")
  };
  if (!errors.availableSeats && Number(form.availableSeats) <= 0) {
    errors.availableSeats = "Available seats must be greater than zero.";
  }
  return errors;
}

export function validateProfileForm(form) {
  return {
    firstName: required(form.firstName, "First name"),
    lastName: required(form.lastName, "Last name"),
    phoneNumber: validatePhoneNumber(form.phoneNumber)
  };
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
