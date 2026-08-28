import { jest } from "@jest/globals";
import { ObjectId } from "mongodb";
import request from "supertest";

let testDb;

jest.unstable_mockModule("../db.js", () => ({
  connectToDatabase: jest.fn(async () => testDb),
  closeDatabase: jest.fn()
}));

const { createApp } = await import("../app.js");
const { createToken, hashPassword, verifyPassword } = await import("../auth.js");
const { validateRideOffer } = await import("../validators.js");

const app = createApp();

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec) {
    const [[field, direction]] = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      const leftValue = left[field] instanceof Date ? left[field].getTime() : left[field];
      const rightValue = right[field] instanceof Date ? right[field].getTime() : right[field];
      if (leftValue === rightValue) return 0;
      return leftValue > rightValue ? direction : -direction;
    });
    return this;
  }

  limit(count) {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs;
  }

  async findOne(filter) {
    return this.docs.find((doc) => matchesFilter(doc, filter)) || null;
  }

  find(filter = {}) {
    return new FakeCursor(this.docs.filter((doc) => matchesFilter(doc, filter)));
  }

  async insertOne(doc) {
    const insertedId = doc._id || new ObjectId();
    this.docs.push({ ...doc, _id: insertedId });
    return { insertedId };
  }

  async updateOne(filter, update) {
    const doc = this.docs.find((item) => matchesFilter(item, filter));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set || {});
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async countDocuments(filter = {}) {
    return this.docs.filter((doc) => matchesFilter(doc, filter)).length;
  }
}

function getValue(doc, key) {
  return key.split(".").reduce((value, part) => value?.[part], doc);
}

function valuesEqual(left, right) {
  if (left instanceof ObjectId || right instanceof ObjectId) return left?.toString() === right?.toString();
  return left === right;
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = getValue(doc, key);
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.some((value) => valuesEqual(actual, value));
    }
    return valuesEqual(actual, expected);
  });
}

function createFakeDb(collections) {
  const collectionMap = new Map(
    Object.entries(collections).map(([name, docs]) => [name, new FakeCollection(docs)])
  );

  return {
    collection(name) {
      if (!collectionMap.has(name)) collectionMap.set(name, new FakeCollection());
      return collectionMap.get(name);
    }
  };
}

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

describe("Sprint 1 code-level test cases", () => {
  let existingUser;
  let existingToken;

  beforeEach(async () => {
    existingUser = {
      _id: new ObjectId(),
      name: "Kasun Fernando",
      email: "kasun@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:00:00.000Z")
    };

    testDb = createFakeDb({
      users: [existingUser],
      profiles: [
        {
          _id: new ObjectId(),
          userId: existingUser._id,
          firstName: "Kasun",
          lastName: "Fernando",
          phoneNumber: "0764567890",
          studentStaffId: "ICBT2024XXXX",
          homeRoute: "Maharagama -> ICBT Campus",
          travelPreferences: [],
          vehicleInformation: null,
          accountType: "ICBT Student",
          updatedAt: new Date("2026-08-01T08:00:00.000Z")
        }
      ],
      rideOffers: [],
      rideOfferDrafts: [],
      joinRequests: [],
      activities: []
    });

    existingToken = createToken(existingUser);
  });

  test("S1-TDD-01 registers a valid new user", async () => {
    const payload = registrationPayload({ email: "validstudent@icbt.lk" });

    const response = await request(app).post("/api/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe("validstudent@icbt.lk");
    expect(response.body.profile.firstName).toBe("Amani");
  });

  test("S1-TDD-02 rejects duplicate email registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(registrationPayload({ email: existingUser.email }));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email address is already registered.");
    expect(await testDb.collection("users").countDocuments({ email: existingUser.email })).toBe(1);
  });

  test("S1-UT-01 validates password hashing and duplicate-email logic", async () => {
    const passwordHash = await hashPassword("Password123");
    const duplicateResponse = await request(app)
      .post("/api/auth/register")
      .send(registrationPayload({ email: existingUser.email }));

    expect(passwordHash).not.toBe("Password123");
    expect(await verifyPassword("Password123", passwordHash)).toBe(true);
    expect(await verifyPassword("WrongPassword", passwordHash)).toBe(false);
    expect(duplicateResponse.status).toBe(409);
    expect(await testDb.collection("users").countDocuments({ email: existingUser.email })).toBe(1);
  });

  test("S1-UT-02 validates login credentials", async () => {
    const validLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: existingUser.email, password: "Password123" });
    const invalidLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: existingUser.email, password: "WrongPassword" });

    expect(validLogin.status).toBe(200);
    expect(validLogin.body.token).toEqual(expect.any(String));
    expect(validLogin.body.user.email).toBe(existingUser.email);
    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body.message).toBe("Invalid email or password.");
  });

  test("S1-UT-03 validates ride-offer input", () => {
    const validOfferErrors = validateRideOffer(ridePayload());
    const zeroSeatsErrors = validateRideOffer(ridePayload({ availableSeats: 0 }));
    const missingDestinationErrors = validateRideOffer(ridePayload({ destination: "" }));

    expect(validOfferErrors).toEqual({});
    expect(zeroSeatsErrors.availableSeats).toBe("Available seats must be greater than zero.");
    expect(missingDestinationErrors.destination).toBe("Destination is required.");
  });

  test("S1-AT-01 completes the registration and login API flow", async () => {
    const payload = registrationPayload({ email: "flowstudent@icbt.lk" });
    const registerResponse = await request(app).post("/api/auth/register").send(payload);
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(registerResponse.status).toBe(201);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    expect(loginResponse.body.user.email).toBe(payload.email);
  });

  test("S1-AT-02 rejects protected route access without authentication", async () => {
    const profileResponse = await request(app).get("/api/me");
    const offerResponse = await request(app).post("/api/ride-offers").send(ridePayload());

    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body.message).toBe("Authentication required.");
    expect(offerResponse.status).toBe(401);
    expect(offerResponse.body.message).toBe("Authentication required.");
  });

  test("S1-AT-03 creates and retrieves an authenticated user's active offer", async () => {
    const createResponse = await request(app)
      .post("/api/ride-offers")
      .set("Authorization", `Bearer ${existingToken}`)
      .send(ridePayload());
    const activeOffersResponse = await request(app)
      .get("/api/ride-offers/active")
      .set("Authorization", `Bearer ${existingToken}`);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.offer.driverId).toBe(existingUser._id.toString());
    expect(createResponse.body.offer.status).toBe("Active");
    expect(activeOffersResponse.status).toBe(200);
    expect(activeOffersResponse.body.offers).toHaveLength(1);
    expect(activeOffersResponse.body.offers[0].id).toBe(createResponse.body.offer.id);
  });
});