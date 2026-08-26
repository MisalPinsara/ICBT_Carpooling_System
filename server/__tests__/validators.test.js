import {
  validateEmail,
  validatePassword,
  validateProfileUpdate,
  validateRegistration,
  validateRideOffer,
  validateDecision
} from "../validators.js";

describe("Sprint 1 validation rules", () => {
  test("UT-01 rejects invalid email addresses", () => {
    expect(validateEmail("student@icbt.lk")).toBe(true);
    expect(validateEmail("student@gmail.com")).toBe(false);
  });

  test("UT-02 rejects weak passwords and mismatched registration passwords", () => {
    expect(validatePassword("short")).toBe(false);

    const errors = validateRegistration({
      firstName: "Nethmi",
      lastName: "Perera",
      email: "nethmi@icbt.lk",
      phoneNumber: "0771234567",
      password: "Password123",
      confirmPassword: "Different123"
    });

    expect(errors.confirmPassword).toBe("Passwords must match.");
  });

  test("UT-08 rejects invalid profile data", () => {
    const errors = validateProfileUpdate({ firstName: "", lastName: "Perera", phoneNumber: "" });
    const nonNumericPhoneErrors = validateProfileUpdate({ firstName: "Nethmi", lastName: "Perera", phoneNumber: "077ABC1234" });
    const longPhoneErrors = validateProfileUpdate({ firstName: "Nethmi", lastName: "Perera", phoneNumber: "07712345678" });

    expect(errors.firstName).toBe("First name is required.");
    expect(errors.phoneNumber).toBe("Phone number is required.");
    expect(nonNumericPhoneErrors.phoneNumber).toBe("Phone number can only include numbers.");
    expect(longPhoneErrors.phoneNumber).toBe("Phone number must be 10 digits or fewer.");
  });

  test("UT-10 rejects ride offers with zero seats", () => {
    const errors = validateRideOffer({
      origin: "Maharagama",
      destination: "ICBT Campus",
      departureDate: "Tomorrow",
      departureTime: "7:30 AM",
      timeWindow: "7:00 AM - 8:00 AM",
      availableSeats: 0
    });

    expect(errors.availableSeats).toBe("Available seats must be greater than zero.");
  });

  test("Sprint 3 validateDecision validates status correctly", () => {
    expect(Object.keys(validateDecision({ status: "Accepted" }))).toHaveLength(0);
    expect(Object.keys(validateDecision({ status: "Rejected" }))).toHaveLength(0);
    expect(Object.keys(validateDecision({ status: "Cancelled" }))).toHaveLength(0);
    expect(Object.keys(validateDecision({ decision: "accepted" }))).toHaveLength(0);
    expect(validateDecision({ status: "Pending" }).status).toBeDefined();
    expect(validateDecision({ status: "Invalid" }).status).toBeDefined();
    expect(validateDecision({}).status).toBeDefined();
  });
});
