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

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    name: "Test User",
    email: "test@icbt.lk",
    passwordHash: "hashed",
    role: "Passenger",
    createdAt: new Date(),
    ...overrides
  };
}

function makeProfile(userId, overrides = {}) {
  return {
    _id: new ObjectId(),
    userId,
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+94 77 000 0000",
    studentStaffId: "ICBT2024TEST",
    homeRoute: "",
    travelPreferences: [],
    vehicleInformation: null,
    accountType: "ICBT Student",
    updatedAt: new Date(),
    ...overrides
  };
}

function makeOffer(userId, overrides = {}) {
  return {
    _id: new ObjectId(),
    userId,
    origin: "Maharagama",
    destination: "ICBT Campus",
    departureDate: "Tomorrow",
    departureTime: "7:30 AM",
    timeWindow: "7:00 AM - 8:00 AM",
    availableSeats: 3,
    acceptedPassengers: 0,
    status: "Active",
    createdAt: new Date("2026-08-20T08:00:00.000Z"),
    ...overrides
  };
}

function makeJoinRequest(rideOfferId, requesterUserId, ownerUserId, overrides = {}) {
  return {
    _id: new ObjectId(),
    rideOfferId,
    requesterUserId,
    ownerUserId,
    status: "Pending",
    requestNote: "",
    requestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("Sprint 2 API tests", () => {
  let driver, passenger, otherPassenger;
  let driverToken, passengerToken, otherPassengerToken;
  let driverOffer, inactiveOffer, fullOffer, cancelledOffer;

  beforeEach(async () => {
    driver = makeUser({ name: "Kasun Fernando", email: "kasun@icbt.lk", role: "Driver" });
    passenger = makeUser({ name: "Nethmi Perera", email: "nethmi@icbt.lk", role: "Passenger" });
    otherPassenger = makeUser({ name: "Ravi Jayasuriya", email: "ravi@icbt.lk", role: "Passenger" });

    driverOffer = makeOffer(driver._id);
    inactiveOffer = makeOffer(driver._id, { status: "Inactive" });
    fullOffer = makeOffer(driver._id, { availableSeats: 0 });
    cancelledOffer = makeOffer(driver._id, { status: "Cancelled" });

    testDb = createFakeDb({
      users: [driver, passenger, otherPassenger],
      profiles: [
        makeProfile(driver._id, {
          firstName: "Kasun",
          lastName: "Fernando",
          phoneNumber: "+94 76 456 7890",
          studentStaffId: "ICBT2024DRVR",
          vehicleInformation: { model: "Toyota Aqua", plateNumber: "WP CAD 1234" }
        }),
        makeProfile(passenger._id, { firstName: "Nethmi", lastName: "Perera" }),
        makeProfile(otherPassenger._id, { firstName: "Ravi", lastName: "Jayasuriya" })
      ],
      rideOffers: [driverOffer, inactiveOffer, fullOffer, cancelledOffer],
      rideOfferDrafts: [],
      joinRequests: [],
      activities: []
    });

    driverToken = createToken(driver);
    passengerToken = createToken(passenger);
    otherPassengerToken = createToken(otherPassenger);
  });

  // ─── TDD-S2-01: Search returns eligible active offers ───────────────────────
  test("TDD-S2-01 search with valid route returns eligible active offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=Maharagama&destination=ICBT")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(1);
    expect(response.body.offers[0].id).toBe(driverOffer._id.toString());
    expect(response.body.offers[0].origin).toBe("Maharagama");
  });

  // ─── TDD-S2-02: Search with no match returns empty ──────────────────────────
  test("TDD-S2-02 search with no matching route returns empty result with message", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=Galle&destination=ICBT")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(0);
    expect(response.body.message).toBeTruthy();
  });

  // ─── TDD-S2-03: Offer detail returns correct fields with limited owner info ──
  test("TDD-S2-03 public offer detail returns correct route/time/seats/status and limited owner", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${driverOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    const { offer } = response.body;
    expect(offer.origin).toBe("Maharagama");
    expect(offer.destination).toBe("ICBT Campus");
    expect(offer.departureTime).toBe("7:30 AM");
    expect(offer.timeWindow).toBe("7:00 AM - 8:00 AM");
    expect(offer.availableSeats).toBe(3);
    expect(offer.status).toBe("Active");
    // Owner summary: only firstName/lastName (UT-S2-05)
    expect(offer.owner.firstName).toBe("Kasun");
    expect(offer.owner.lastName).toBe("Fernando");
    expect(offer.owner.phoneNumber).toBeUndefined();
    expect(offer.owner.email).toBeUndefined();
    expect(offer.owner.studentStaffId).toBeUndefined();
    // driverId must not be exposed
    expect(offer.userId).toBeUndefined();
  });

  // ─── TDD-S2-04: Valid join request creates a Pending record ─────────────────
  test("TDD-S2-04 valid join request creates a Pending JoinRequest with correct fields", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: driverOffer._id.toString(), requestNote: "Please pick me up" });

    expect(response.status).toBe(201);
    const { joinRequest } = response.body;
    expect(joinRequest.status).toBe("Pending");
    expect(joinRequest.rideOfferId).toBe(driverOffer._id.toString());
    expect(joinRequest.ownerUserId).toBe(driver._id.toString());
    // Offer summary embedded
    expect(joinRequest.offer.origin).toBe("Maharagama");
  });

  // ─── TDD-S2-05: Duplicate Pending request is blocked ────────────────────────
  test("TDD-S2-05 duplicate active request for same offer is blocked", async () => {
    // Seed an existing Pending request from passenger
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(driverOffer._id, passenger._id, driver._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/pending/i);
  });

  // ─── TDD-S2-06: Self-request is blocked ─────────────────────────────────────
  test("TDD-S2-06 offer owner attempting to request own offer is blocked", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/own/i);
  });

  // ─── TDD-S2-07: Full/inactive/cancelled offer cannot be requested ────────────
  test("TDD-S2-07 request for inactive offer is rejected", async () => {
    const res = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: inactiveOffer._id.toString() });
    expect(res.status).toBe(422);
  });

  test("TDD-S2-07 request for full offer (0 seats) is rejected", async () => {
    const res = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: fullOffer._id.toString() });
    expect(res.status).toBe(422);
  });

  test("TDD-S2-07 request for cancelled offer is rejected", async () => {
    const res = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: cancelledOffer._id.toString() });
    expect(res.status).toBe(422);
  });

  // ─── TDD-S2-08: Own request-status view ─────────────────────────────────────
  test("TDD-S2-08 authenticated requester sees only their own request records", async () => {
    // Passenger has 1 request, otherPassenger has 1 request
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(driverOffer._id, passenger._id, driver._id),
      makeJoinRequest(driverOffer._id, otherPassenger._id, driver._id)
    );

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].ownerUserId).toBe(driver._id.toString());
  });

  // ─── TDD-S2-09: Unauthenticated access is denied ────────────────────────────
  test("TDD-S2-09 unauthenticated user cannot access protected endpoints", async () => {
    const [searchRes, detailRes, joinRes, mineRes] = await Promise.all([
      request(app).get("/api/ride-offers/search?origin=Maharagama"),
      request(app).get(`/api/ride-offers/public/${driverOffer._id}`),
      request(app).post("/api/join-requests").send({ rideOfferId: driverOffer._id.toString() }),
      request(app).get("/api/join-requests/mine")
    ]);
    expect(searchRes.status).toBe(401);
    expect(detailRes.status).toBe(401);
    expect(joinRes.status).toBe(401);
    expect(mineRes.status).toBe(401);
  });

  // ─── UT-S2-01: Search query normalisation (spaces/case) ─────────────────────
  test("UT-S2-01 search normalises input strings (spaces and case differences)", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=maharagama&destination=icbt+campus")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(1);
  });

  // ─── UT-S2-02: Active offer filter ──────────────────────────────────────────
  test("UT-S2-02 search only returns Active offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${passengerToken}`);

    const statuses = response.body.offers.map((o) => o.status);
    expect(statuses.every((s) => s === "Active")).toBe(true);
  });

  // ─── UT-S2-03: Seat availability filter ─────────────────────────────────────
  test("UT-S2-03 search excludes offers with 0 available seats", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${passengerToken}`);

    const ids = response.body.offers.map((o) => o.id);
    expect(ids).not.toContain(fullOffer._id.toString());
  });

  // ─── UT-S2-04: Offer detail response fields ──────────────────────────────────
  test("UT-S2-04 public offer detail returns all required display fields", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${driverOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    const { offer } = response.body;
    expect(offer).toHaveProperty("origin");
    expect(offer).toHaveProperty("destination");
    expect(offer).toHaveProperty("departureDate");
    expect(offer).toHaveProperty("departureTime");
    expect(offer).toHaveProperty("timeWindow");
    expect(offer).toHaveProperty("availableSeats");
    expect(offer).toHaveProperty("status");
  });

  // ─── UT-S2-05: Offer detail privacy ──────────────────────────────────────────
  test("UT-S2-05 public offer detail does not expose private contact data", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${driverOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    const { offer } = response.body;
    expect(offer.userId).toBeUndefined();
    expect(offer.owner?.phoneNumber).toBeUndefined();
    expect(offer.owner?.email).toBeUndefined();
    expect(offer.owner?.studentStaffId).toBeUndefined();
  });

  // ─── UT-S2-06: JoinRequest validation ────────────────────────────────────────
  test("UT-S2-06 valid join request for active offer is inserted successfully", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.joinRequest.status).toBe("Pending");

    const stored = await testDb.collection("joinRequests").findOne({
      rideOfferId: driverOffer._id,
      requesterUserId: passenger._id
    });
    expect(stored).not.toBeNull();
    expect(stored.ownerUserId.toString()).toBe(driver._id.toString());
  });

  // ─── UT-S2-07: Duplicate request check ───────────────────────────────────────
  test("UT-S2-07 second Pending request for same offer is rejected", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(driverOffer._id, passenger._id, driver._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(409);
  });

  // ─── UT-S2-08: Self-request check ────────────────────────────────────────────
  test("UT-S2-08 requesterUserId equals ownerUserId is rejected", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/own/i);
  });

  // ─── UT-S2-09: Unavailable offer check ───────────────────────────────────────
  test("UT-S2-09 join request for unavailable offer (inactive/full/cancelled) is rejected", async () => {
    const [inactiveRes, fullRes, cancelledRes] = await Promise.all([
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: inactiveOffer._id.toString() }),
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: fullOffer._id.toString() }),
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: cancelledOffer._id.toString() })
    ]);
    expect(inactiveRes.status).toBe(422);
    expect(fullRes.status).toBe(422);
    expect(cancelledRes.status).toBe(422);
  });

  // ─── UT-S2-10: Request-status filtering ──────────────────────────────────────
  test("UT-S2-10 only authenticated user's own requests are returned", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(driverOffer._id, passenger._id, driver._id),
      makeJoinRequest(driverOffer._id, otherPassenger._id, driver._id)
    );

    const [passengerRes, otherRes] = await Promise.all([
      request(app).get("/api/join-requests/mine").set("Authorization", `Bearer ${passengerToken}`),
      request(app).get("/api/join-requests/mine").set("Authorization", `Bearer ${otherPassengerToken}`)
    ]);

    expect(passengerRes.status).toBe(200);
    expect(passengerRes.body.joinRequests).toHaveLength(1);

    expect(otherRes.status).toBe(200);
    expect(otherRes.body.joinRequests).toHaveLength(1);
  });

  // ─── UT-S2-11: Protected endpoint guard ──────────────────────────────────────
  test("UT-S2-11 request without token/session is denied with 401", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .send({ rideOfferId: driverOffer._id.toString() });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  // ─── UT-S2-12: Sprint 1 regression ───────────────────────────────────────────
  // Verified by running the full test suite (sprint1-api.test.js passes alongside
  // this file). Included here as a canary smoke-test of the health endpoint.
  test("UT-S2-12 Sprint 1 regression: health endpoint still returns ok", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
