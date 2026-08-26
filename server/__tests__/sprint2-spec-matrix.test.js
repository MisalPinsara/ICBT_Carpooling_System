/**
 * Sprint 2 TDD & Unit Test Suite Matrix
 * =====================================
 * Directly maps to:
 *   Section 6.3 TDD Test Cases (TDD-01 through TDD-08)
 *   Section 7   Unit Testing   (UT-01 through UT-08)
 *
 * Rules:
 *   - Each test case in the specification screenshot is conducted by its own standalone test script block.
 *   - No single test script combines multiple test cases.
 *   - All tests run against in-memory mock database using Supertest.
 */

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
const { createToken } = await import("../auth.js");

const app = createApp();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    name: "Test User",
    email: "user@icbt.lk",
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
    phoneNumber: "+94 77 123 4567",
    studentStaffId: "ICBT2024TEST",
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
    createdAt: new Date(),
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
    requestNote: "Looking for a ride",
    requestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite Matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("Sprint 2 Developer Specification Matrix", () => {
  let offerOwner;
  let requester;
  let otherUser;

  let ownerToken;
  let requesterToken;
  let otherToken;

  let activeOffer;
  let fullOffer;
  let inactiveOffer;

  beforeEach(() => {
    offerOwner = makeUser({ name: "Kasun Fernando", email: "kasun@icbt.lk" });
    requester = makeUser({ name: "Nethmi Perera", email: "nethmi@icbt.lk" });
    otherUser = makeUser({ name: "Ravi Jayasuriya", email: "ravi@icbt.lk" });

    activeOffer = makeOffer(offerOwner._id, { availableSeats: 3, status: "Active" });
    fullOffer = makeOffer(offerOwner._id, { availableSeats: 0, status: "Active" });
    inactiveOffer = makeOffer(offerOwner._id, { availableSeats: 2, status: "Inactive" });

    testDb = createFakeDb({
      users: [offerOwner, requester, otherUser],
      profiles: [
        makeProfile(offerOwner._id, { firstName: "Kasun", lastName: "Fernando", phoneNumber: "+94764567890" }),
        makeProfile(requester._id, { firstName: "Nethmi", lastName: "Perera" }),
        makeProfile(otherUser._id, { firstName: "Ravi", lastName: "Jayasuriya" })
      ],
      rideOffers: [activeOffer, fullOffer, inactiveOffer],
      joinRequests: [],
      activities: []
    });

    ownerToken = createToken(offerOwner);
    requesterToken = createToken(requester);
    otherToken = createToken(otherUser);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6.3 TDD Test Cases
  // ═══════════════════════════════════════════════════════════════════════════

  // TDD-01: Feature = Search, Test Scenario = Search with valid route/time criteria, Expected Result = Eligible active offers are displayed.
  test("TDD-01: Search with valid route/time criteria displays eligible active offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=Maharagama&destination=ICBT")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toBeDefined();
    expect(response.body.offers.length).toBeGreaterThan(0);
    expect(response.body.offers[0].id).toBe(activeOffer._id.toString());
  });

  // TDD-02: Feature = Offer Details, Test Scenario = Open a matching offer, Expected Result = Correct route, time, seats, status and limited owner data are displayed.
  test("TDD-02: Open a matching offer displays correct route, time, seats, status and limited owner data", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${activeOffer._id}`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    const { offer } = response.body;
    expect(offer.origin).toBe("Maharagama");
    expect(offer.destination).toBe("ICBT Campus");
    expect(offer.departureTime).toBe("7:30 AM");
    expect(offer.availableSeats).toBe(3);
    expect(offer.status).toBe("Active");
    expect(offer.owner.firstName).toBe("Kasun");
    expect(offer.owner.lastName).toBe("Fernando");
    expect(offer.owner.phoneNumber).toBeUndefined();
    expect(offer.owner.email).toBeUndefined();
  });

  // TDD-03: Feature = Join Request, Test Scenario = Submit valid join request, Expected Result = Pending JoinRequest is created with correct references.
  test("TDD-03: Submit valid join request creates Pending JoinRequest with correct references", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString(), requestNote: "Please pick me up" });

    expect(response.status).toBe(201);
    expect(response.body.joinRequest).toBeDefined();
    expect(response.body.joinRequest.status).toBe("Pending");
    expect(response.body.joinRequest.rideOfferId).toBe(activeOffer._id.toString());
    expect(response.body.joinRequest.ownerUserId).toBe(offerOwner._id.toString());
  });

  // TDD-04: Feature = Request Status, Test Scenario = View own requests, Expected Result = Authenticated requester sees their own request and current status.
  test("TDD-04: View own requests returns authenticated requester's own request and current status", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].status).toBe("Pending");
  });

  // TDD-05: Feature = Join Request, Test Scenario = Submit duplicate active request, Expected Result = Duplicate request is blocked.
  test("TDD-05: Submit duplicate active request is blocked", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/pending/i);
  });

  // TDD-06: Feature = Join Request, Test Scenario = Owner attempts own offer request, Expected Result = Self-request is blocked.
  test("TDD-06: Owner attempts own offer request is blocked", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/own/i);
  });

  // TDD-07: Feature = Search, Test Scenario = Search for unavailable/full offers, Expected Result = Unavailable/full offers are excluded.
  test("TDD-07: Search for unavailable/full offers excludes them from results", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    const returnedIds = response.body.offers.map((o) => o.id);
    expect(returnedIds).not.toContain(fullOffer._id.toString());
    expect(returnedIds).not.toContain(inactiveOffer._id.toString());
  });

  // TDD-08: Feature = Authorization, Test Scenario = Unauthenticated user attempts protected action, Expected Result = Access/action is denied.
  test("TDD-08: Unauthenticated user attempts protected action is denied access", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Unit Testing
  // ═══════════════════════════════════════════════════════════════════════════

  // UT-01: Function / Logic = Search eligibility, Test Input = Active offer with seats > 0, Expected Result = Offer is eligible for search result.
  test("UT-01: Search eligibility returns active offer with seats > 0 as eligible result", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    const offer = response.body.offers.find((o) => o.id === activeOffer._id.toString());
    expect(offer).toBeDefined();
    expect(offer.availableSeats).toBeGreaterThan(0);
    expect(offer.status).toBe("Active");
  });

  // UT-02: Function / Logic = Search eligibility, Test Input = Full/inactive offer, Expected Result = Offer is excluded.
  test("UT-02: Search eligibility excludes full/inactive offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    const ids = response.body.offers.map((o) => o.id);
    expect(ids).not.toContain(fullOffer._id.toString());
    expect(ids).not.toContain(inactiveOffer._id.toString());
  });

  // UT-03: Function / Logic = Search normalization, Test Input = Leading/trailing spaces, Expected Result = Input is trimmed consistently.
  test("UT-03: Search normalization trims leading/trailing spaces consistently", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=%20Maharagama%20&destination=%20ICBT%20")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers.length).toBeGreaterThan(0);
    expect(response.body.offers[0].origin).toBe("Maharagama");
  });

  // UT-04: Function / Logic = Join-request validation, Test Input = Requester = offer owner, Expected Result = Request is rejected.
  test("UT-04: Join-request validation rejects request when requester = offer owner", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(422);
  });

  // UT-05: Function / Logic = Duplicate check, Test Input = Existing active request, Expected Result = New duplicate request is rejected.
  test("UT-05: Duplicate check rejects new duplicate request when active request exists", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(409);
  });

  // UT-06: Function / Logic = Seat validation, Test Input = availableSeats = 0, Expected Result = Request is rejected.
  test("UT-06: Seat validation rejects request when availableSeats = 0", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: fullOffer._id.toString() });

    expect(response.status).toBe(422);
  });

  // UT-07: Function / Logic = Request creation, Test Input = Valid requester + active offer, Expected Result = Pending request is created.
  test("UT-07: Request creation creates Pending request for valid requester + active offer", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.joinRequest.status).toBe("Pending");

    const inDb = await testDb.collection("joinRequests").findOne({
      rideOfferId: activeOffer._id,
      requesterUserId: requester._id
    });
    expect(inDb).not.toBeNull();
  });

  // UT-08: Function / Logic = Ownership filter, Test Input = Request belongs to another user, Expected Result = Record is not returned to requester.
  test("UT-08: Ownership filter does not return record belonging to another user to requester", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, otherUser._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(0);
  });
});
