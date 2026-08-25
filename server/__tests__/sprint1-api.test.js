import { jest } from "@jest/globals";
import { ObjectId } from "mongodb";
import request from "supertest";
import { createFakeDb } from "./testHelpers.js";

let testDb;

jest.unstable_mockModule("../db.js", () => ({
  connectToDatabase: jest.fn(async () => testDb),
  closeDatabase: jest.fn()
}));

const { createApp } = await import("../app.js");
const { createToken, hashPassword } = await import("../auth.js");

const app = createApp();

function registrationPayload(overrides = {}) {
  return {
    firstName: "Amani",
    lastName: "Silva",
    email: "amani@icbt.lk",
    phoneNumber: "0771112222",
    password: "Password123",
    confirmPassword: "Password123",
    ...overrides
  };
}

function ridePayload(overrides = {}) {
  return {
    origin: "Maharagama",
    destination: "ICBT Campus",
    departureDate: "Tomorrow",
    departureTime: "7:30 AM",
    timeWindow: "7:00 AM - 8:00 AM",
    availableSeats: 2,
    ...overrides
  };
}

describe("Sprint 1 API unit tests", () => {
  let driver;
  let passenger;
  let otherDriver;
  let driverToken;
  let passengerToken;
  let driverOffer;
  let otherDriverOffer;

  beforeEach(async () => {
    driver = {
      _id: new ObjectId(),
      name: "Kasun Fernando",
      email: "kasun@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:00:00.000Z")
    };
    passenger = {
      _id: new ObjectId(),
      name: "Nethmi Perera",
      email: "nethmi@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:05:00.000Z")
    };
    otherDriver = {
      _id: new ObjectId(),
      name: "Ravi Jayasuriya",
      email: "ravi@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:10:00.000Z")
    };
    driverOffer = {
      _id: new ObjectId(),
      userId: driver._id,
      origin: "Maharagama",
      destination: "ICBT Campus",
      departureDate: "Tomorrow",
      departureTime: "7:30 AM",
      timeWindow: "7:00 AM - 8:00 AM",
      availableSeats: 2,
      acceptedPassengers: 0,
      status: "Active",
      createdAt: new Date("2026-08-20T08:00:00.000Z")
    };
    otherDriverOffer = {
      _id: new ObjectId(),
      userId: otherDriver._id,
      origin: "Nugegoda",
      destination: "ICBT Campus",
      departureDate: "Friday",
      departureTime: "8:10 AM",
      timeWindow: "7:45 AM - 8:30 AM",
      availableSeats: 3,
      acceptedPassengers: 0,
      status: "Active",
      createdAt: new Date("2026-08-20T09:00:00.000Z")
    };

    testDb = createFakeDb({
      users: [driver, passenger, otherDriver],
      profiles: [
        {
          _id: new ObjectId(),
          userId: driver._id,
          firstName: "Kasun",
          lastName: "Fernando",
          phoneNumber: "0764567890",
          studentStaffId: "ICBT2024DRVR",
          homeRoute: "Maharagama -> ICBT Campus",
          travelPreferences: [],
          vehicleInformation: { model: "Toyota Aqua", plateNumber: "WP CAD 1234" },
          accountType: "ICBT Student",
          updatedAt: new Date()
        },
        {
          _id: new ObjectId(),
          userId: passenger._id,
          firstName: "Nethmi",
          lastName: "Perera",
          phoneNumber: "0771234567",
          studentStaffId: "ICBT2024XXXX",
          homeRoute: "Panadura -> ICBT Campus",
          travelPreferences: [],
          vehicleInformation: null,
          accountType: "ICBT Student",
          updatedAt: new Date()
        }
      ],
      rideOffers: [
        driverOffer,
        { ...driverOffer, _id: new ObjectId(), status: "Completed", createdAt: new Date("2026-08-19T08:00:00.000Z") },
        otherDriverOffer
      ],
      rideOfferDrafts: [],
      joinRequests: [],
      activities: []
    });

    driverToken = createToken(driver);
    passengerToken = createToken(passenger);
  });

  test("UT-03 blocks duplicate email registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(registrationPayload({ email: driver.email }));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email address is already registered.");
  });

  test("TDD-01 creates an account with valid registration details", async () => {
    const payload = registrationPayload({ email: "validstudent@icbt.lk" });

    const response = await request(app).post("/api/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(payload.email);
    expect(response.body.profile.firstName).toBe(payload.firstName);
  });

  test("TDD-02 rejects registration with an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(registrationPayload({ email: "student@gmail.com" }));

    expect(response.status).toBe(400);
    expect(response.body.errors.email).toBe("A valid email is required.");
  });

  test("UT-04 stores a password hash instead of the plain registration password", async () => {
    const payload = registrationPayload({ email: "newstudent@icbt.lk" });

    const response = await request(app).post("/api/auth/register").send(payload);
    const storedUser = await testDb.collection("users").findOne({ email: payload.email });

    expect(response.status).toBe(201);
    expect(storedUser.passwordHash).not.toBe(payload.password);
    expect(storedUser.passwordHash).toEqual(expect.any(String));
  });

  test("UT-05 authenticates valid login credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: driver.email, password: "Password123" });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(driver.email);
  });

  test("UT-06 rejects incorrect login password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: driver.email, password: "WrongPassword" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password.");
  });

  test("UT-07 denies protected route access without a token", async () => {
    const response = await request(app).get("/api/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  test("TDD-06 displays the authenticated user's own profile", async () => {
    const response = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(driver._id.toString());
    expect(response.body.profile.userId).toBe(driver._id.toString());
  });

  test("TDD-07 updates valid profile details", async () => {
    const response = await request(app)
      .put("/api/profile")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        firstName: "Kasun",
        lastName: "Perera",
        phoneNumber: "0712223333",
        homeRoute: "Kottawa -> ICBT Campus"
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("Kasun Perera");
    expect(response.body.profile.phoneNumber).toBe("0712223333");
    expect(response.body.profile.homeRoute).toBe("Kottawa -> ICBT Campus");
  });

  test("UT-08 rejects invalid profile update data", async () => {
    const response = await request(app)
      .put("/api/profile")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ firstName: "", lastName: "Fernando", phoneNumber: "" });

    expect(response.status).toBe(400);
    expect(response.body.errors.firstName).toBe("First name is required.");
    expect(response.body.errors.phoneNumber).toBe("Phone number is required.");
  });

  test("UT-09 denies access to another user's profile", async () => {
    const response = await request(app)
      .get(`/api/users/${passenger._id}/profile`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You can only view your own profile.");
  });

  test("UT-10 rejects ride offers with zero seats", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(ridePayload({ availableSeats: 0 }));

    expect(response.status).toBe(400);
    expect(response.body.errors.availableSeats).toBe("Available seats must be greater than zero.");
  });

  test("UT-11 rejects ride offers with negative seats", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(ridePayload({ availableSeats: -1 }));

    expect(response.status).toBe(400);
    expect(response.body.errors.availableSeats).toBe("Available seats must be greater than zero.");
  });

  test("UT-12 rejects ride offers missing origin", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(ridePayload({ origin: "" }));

    expect(response.status).toBe(400);
    expect(response.body.errors.origin).toBe("Origin is required.");
  });

  test("UT-13 rejects ride offers missing destination", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(ridePayload({ destination: "" }));

    expect(response.status).toBe(400);
    expect(response.body.errors.destination).toBe("Destination is required.");
  });

  test("UT-14 links a created ride offer to the authenticated user", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(ridePayload());

    expect(response.status).toBe(201);
    expect(response.body.offer.userId).toBe(driver._id.toString());
    expect(response.body.offer.status).toBe("Active");
  });

  test("UT-15 returns only active offers for the authenticated user", async () => {
    const response = await request(app)
      .get("/api/ride-offers/active")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(1);
    expect(response.body.offers[0].id).toBe(driverOffer._id.toString());
    expect(response.body.offers[0].userId).toBe(driver._id.toString());
    expect(response.body.offers[0].status).toBe("Active");
  });

  test("UT-16 allows any authenticated user to create a ride offer", async () => {
    const response = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send(ridePayload());

    expect(response.status).toBe(201);
    expect(response.body.offer.driverId).toBe(passenger._id.toString());
    expect(response.body.offer.status).toBe("Active");
  });

  test("Ride detail view returns only an authenticated owner's own offer", async () => {
    const ownOfferResponse = await request(app)
      .get(`/api/ride-offers/${driverOffer._id}`)
      .set("Authorization", `Bearer ${driverToken}`);
    const otherOfferResponse = await request(app)
      .get(`/api/ride-offers/${otherDriverOffer._id}`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(ownOfferResponse.status).toBe(200);
    expect(ownOfferResponse.body.offer.id).toBe(driverOffer._id.toString());
    expect(otherOfferResponse.status).toBe(404);
  });
});
