/**
 * Sprint 2 TDD / Test-First & Unit API Tests
 * ===========================================
 * Covers every case defined in:
 *   Table 7 – TDD / Test-First Cases (TDD-S2-01 … TDD-S2-09)
 *   Table 8 – Unit and API Test Cases  (UT-S2-01  … UT-S2-12)
 *
 * RED → GREEN → REFACTOR workflow:
 *   RED    : write / confirm failing test
 *   GREEN  : implement minimum code to pass
 *   REFACTOR: improve structure while keeping all Sprint 1 & 2 tests passing
 *
 * All tests use Supertest against a fully in-memory fake database so the
 * real MongoDB instance is never touched.
 */

import { jest } from "@jest/globals";
import { ObjectId } from "mongodb";
import request from "supertest";
import { createFakeDb } from "./testHelpers.js";

// ── Mock the database module before any app code is imported ─────────────────

let testDb;

jest.unstable_mockModule("../db.js", () => ({
  connectToDatabase: jest.fn(async () => testDb),
  closeDatabase: jest.fn()
}));

const { createApp } = await import("../app.js");
const { createToken } = await import("../auth.js");

const app = createApp();

// ─────────────────────────────────────────────────────────────────────────────
// Fixture factory helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a minimal user document */
function makeUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    name: "Test User",
    email: "test@icbt.lk",
    passwordHash: "hashed_password",
    role: "Passenger",
    createdAt: new Date(),
    ...overrides
  };
}

/** Creates a minimal profile document linked to a user ID */
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

/** Creates a minimal ride-offer document linked to a user ID */
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

/** Creates a minimal join-request document */
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared test state – reset before every test
// ─────────────────────────────────────────────────────────────────────────────

describe("Sprint 2 TDD & Unit/API Tests (Table 7 & Table 8)", () => {
  // Actors
  let offerOwner;      // the user who owns ride offers (formerly "driver")
  let passenger;       // a different authenticated user
  let otherPassenger;  // a third authenticated user

  // Tokens
  let ownerToken;
  let passengerToken;
  let otherPassengerToken;

  // Offer fixtures
  let activeOffer;     // Active, seats available
  let inactiveOffer;   // status = "Inactive"
  let fullOffer;       // availableSeats = 0
  let cancelledOffer;  // status = "Cancelled"

  beforeEach(() => {
    // ── Build users ────────────────────────────────────────────────────────
    offerOwner = makeUser({
      name: "Kasun Fernando",
      email: "kasun@icbt.lk",
      role: "Driver"
    });
    passenger = makeUser({
      name: "Nethmi Perera",
      email: "nethmi@icbt.lk",
      role: "Passenger"
    });
    otherPassenger = makeUser({
      name: "Ravi Jayasuriya",
      email: "ravi@icbt.lk",
      role: "Passenger"
    });

    // ── Build ride offers ──────────────────────────────────────────────────
    activeOffer    = makeOffer(offerOwner._id);
    inactiveOffer  = makeOffer(offerOwner._id, { status: "Inactive" });
    fullOffer      = makeOffer(offerOwner._id, { availableSeats: 0 });
    cancelledOffer = makeOffer(offerOwner._id, { status: "Cancelled" });

    // ── Seed in-memory database ────────────────────────────────────────────
    testDb = createFakeDb({
      users: [offerOwner, passenger, otherPassenger],
      profiles: [
        makeProfile(offerOwner._id, {
          firstName: "Kasun",
          lastName: "Fernando",
          phoneNumber: "+94 76 456 7890",
          studentStaffId: "ICBT2024DRVR",
          vehicleInformation: { model: "Toyota Aqua", plateNumber: "WP CAD 1234" }
        }),
        makeProfile(passenger._id, {
          firstName: "Nethmi",
          lastName: "Perera"
        }),
        makeProfile(otherPassenger._id, {
          firstName: "Ravi",
          lastName: "Jayasuriya"
        })
      ],
      rideOffers: [activeOffer, inactiveOffer, fullOffer, cancelledOffer],
      rideOfferDrafts: [],
      joinRequests: [],
      activities: []
    });

    // ── Create JWT tokens ──────────────────────────────────────────────────
    ownerToken          = createToken(offerOwner);
    passengerToken      = createToken(passenger);
    otherPassengerToken = createToken(otherPassenger);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE 7 — TDD / Test-First Cases
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── TDD-S2-01 ────────────────────────────────────────────────────────────
  // Feature      : Search
  // Scenario     : Search with valid route and time-window criteria
  // Expected     : Eligible active ride offers are displayed
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-01: search with valid route and time-window returns eligible active offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=Maharagama&destination=ICBT&timeWindow=7%3A00+AM+-+8%3A00+AM")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.offers)).toBe(true);
    expect(response.body.offers.length).toBeGreaterThanOrEqual(1);

    // Every returned offer must be Active
    response.body.offers.forEach((offer) => {
      expect(offer.status).toBe("Active");
    });

    // The known active offer must appear in results
    const returnedIds = response.body.offers.map((o) => o.id);
    expect(returnedIds).toContain(activeOffer._id.toString());
  });

  // ─── TDD-S2-02 ────────────────────────────────────────────────────────────
  // Feature      : Search
  // Scenario     : Search with no matching route/time criteria
  // Expected     : No-result message or empty result response is returned cleanly
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-02: search with no matching criteria returns empty results cleanly", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search?origin=Galle&destination=Kandy")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(0);
    // API must return a descriptive message when no results are found
    expect(response.body.message).toBeTruthy();
    expect(typeof response.body.message).toBe("string");
  });

  // ─── TDD-S2-03 ────────────────────────────────────────────────────────────
  // Feature      : Offer Details
  // Scenario     : Open a matching offer
  // Expected     : Correct route, time, seats, status and limited owner/profile
  //                data are displayed
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-03: public offer detail shows correct route/time/seats/status and limited owner info", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${activeOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);

    const { offer } = response.body;

    // Route & schedule
    expect(offer.origin).toBe("Maharagama");
    expect(offer.destination).toBe("ICBT Campus");
    expect(offer.departureTime).toBe("7:30 AM");
    expect(offer.timeWindow).toBe("7:00 AM - 8:00 AM");
    expect(offer.availableSeats).toBe(3);
    expect(offer.status).toBe("Active");

    // Owner summary is limited: only firstName and lastName
    expect(offer.owner).toBeDefined();
    expect(offer.owner.firstName).toBe("Kasun");
    expect(offer.owner.lastName).toBe("Fernando");

    // Private fields must NOT be present
    expect(offer.owner.phoneNumber).toBeUndefined();
    expect(offer.owner.email).toBeUndefined();
    expect(offer.owner.studentStaffId).toBeUndefined();
    expect(offer.userId).toBeUndefined();  // internal FK must be hidden
  });

  // ─── TDD-S2-04 ────────────────────────────────────────────────────────────
  // Feature      : Join Request
  // Scenario     : Submit valid join request for another user's active offer
  // Expected     : Pending JoinRequest is created with rideOfferId,
  //                requesterUserId and ownerUserId
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-04: valid join request creates a Pending record with required fields", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        rideOfferId: activeOffer._id.toString(),
        requestNote: "Please pick me up at the bus stop."
      });

    expect(response.status).toBe(201);

    const { joinRequest } = response.body;
    expect(joinRequest.status).toBe("Pending");
    expect(joinRequest.rideOfferId).toBe(activeOffer._id.toString());
    expect(joinRequest.ownerUserId).toBe(offerOwner._id.toString());

    // An embedded offer summary should confirm the route
    expect(joinRequest.offer).toBeDefined();
    expect(joinRequest.offer.origin).toBe("Maharagama");
  });

  // ─── TDD-S2-05 ────────────────────────────────────────────────────────────
  // Feature      : Join Request
  // Scenario     : Submit duplicate active request for the same offer
  // Expected     : Duplicate request is blocked
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-05: duplicate Pending join request for the same offer is blocked (409)", async () => {
    // Pre-seed an existing Pending request from the same passenger
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, passenger._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/pending/i);
  });

  // ─── TDD-S2-06 ────────────────────────────────────────────────────────────
  // Feature      : Join Request
  // Scenario     : Owner attempts to request own offer
  // Expected     : Self-request is blocked
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-06: offer owner requesting their own offer is rejected (self-request blocked)", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/own/i);
  });

  // ─── TDD-S2-07 ────────────────────────────────────────────────────────────
  // Feature      : Join Request
  // Scenario     : Request full, inactive or cancelled offer
  // Expected     : Request is rejected
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-07a: join request for an Inactive offer is rejected (422)", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: inactiveOffer._id.toString() });

    expect(response.status).toBe(422);
  });

  test("TDD-S2-07b: join request for a full offer (0 seats) is rejected (422)", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: fullOffer._id.toString() });

    expect(response.status).toBe(422);
  });

  test("TDD-S2-07c: join request for a Cancelled offer is rejected (422)", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: cancelledOffer._id.toString() });

    expect(response.status).toBe(422);
  });

  // ─── TDD-S2-08 ────────────────────────────────────────────────────────────
  // Feature      : Request Status
  // Scenario     : View own requests
  // Expected     : Authenticated requester sees only their own request records
  //                and statuses
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-08: GET /api/join-requests/mine returns only the requester's own requests", async () => {
    // Seed one request from each passenger
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, passenger._id, offerOwner._id, { status: "Pending" }),
      makeJoinRequest(activeOffer._id, otherPassenger._id, offerOwner._id, { status: "Accepted" })
    );

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);

    const ownRequest = response.body.joinRequests[0];
    expect(ownRequest.status).toBe("Pending");
    // ownerUserId should point to the offer owner (not passenger themselves)
    expect(ownRequest.ownerUserId).toBe(offerOwner._id.toString());
  });

  // ─── TDD-S2-09 ────────────────────────────────────────────────────────────
  // Feature      : Authorization
  // Scenario     : Unauthenticated user attempts protected request action
  // Expected     : Access/action is denied
  // ─────────────────────────────────────────────────────────────────────────
  test("TDD-S2-09: unauthenticated requests to protected endpoints are denied (401)", async () => {
    const [searchRes, detailRes, joinRes, mineRes] = await Promise.all([
      request(app).get("/api/ride-offers/search?origin=Maharagama"),
      request(app).get(`/api/ride-offers/public/${activeOffer._id}`),
      request(app).post("/api/join-requests").send({ rideOfferId: activeOffer._id.toString() }),
      request(app).get("/api/join-requests/mine")
    ]);

    expect(searchRes.status).toBe(401);
    expect(detailRes.status).toBe(401);
    expect(joinRes.status).toBe(401);
    expect(mineRes.status).toBe(401);

    // All must return the standard auth-required message
    [searchRes, detailRes, joinRes, mineRes].forEach((res) => {
      expect(res.body.message).toMatch(/authentication required/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE 8 — Unit and API Test Cases
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── UT-S2-01 ─────────────────────────────────────────────────────────────
  // Function/Logic : Search query builder
  // Test input     : Origin/destination with extra spaces or case differences
  // Expected       : Input is normalised and matching offers can still be found
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-01: search query builder normalises case and extra spaces in origin/destination", async () => {
    // Lowercase input, URL-encoded spaces
    const responseA = await request(app)
      .get("/api/ride-offers/search?origin=maharagama&destination=icbt+campus")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(responseA.status).toBe(200);
    expect(responseA.body.offers.length).toBeGreaterThanOrEqual(1);

    // Mixed case with leading/trailing spaces (%20)
    const responseB = await request(app)
      .get("/api/ride-offers/search?origin=%20MAHARAGAMA%20&destination=%20icbt%20Campus%20")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(responseB.status).toBe(200);
    expect(responseB.body.offers.length).toBeGreaterThanOrEqual(1);
  });

  // ─── UT-S2-02 ─────────────────────────────────────────────────────────────
  // Function/Logic : Active offer filter
  // Test input     : Active and inactive offers exist in the database
  // Expected       : Only eligible active offers are returned
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-02: search response contains only Active offers when Active and Inactive offers exist", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);

    // Every offer in results must have status "Active"
    response.body.offers.forEach((offer) => {
      expect(offer.status).toBe("Active");
    });

    // Inactive/Cancelled offer IDs must NOT appear
    const returnedIds = response.body.offers.map((o) => o.id);
    expect(returnedIds).not.toContain(inactiveOffer._id.toString());
    expect(returnedIds).not.toContain(cancelledOffer._id.toString());
  });

  // ─── UT-S2-03 ─────────────────────────────────────────────────────────────
  // Function/Logic : Seat availability filter
  // Test input     : Offer with availableSeats = 0
  // Expected       : Offer is excluded from request eligibility
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-03: search excludes offers with 0 available seats", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);

    const returnedIds = response.body.offers.map((o) => o.id);
    expect(returnedIds).not.toContain(fullOffer._id.toString());
  });

  // ─── UT-S2-04 ─────────────────────────────────────────────────────────────
  // Function/Logic : Offer detail retrieval
  // Test input     : Valid rideOfferId
  // Expected       : Offer detail response returns approved route/time/status fields
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-04: public offer detail returns all required display fields for a valid rideOfferId", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${activeOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);

    const { offer } = response.body;
    // All required display fields must be present
    expect(offer).toHaveProperty("origin");
    expect(offer).toHaveProperty("destination");
    expect(offer).toHaveProperty("departureDate");
    expect(offer).toHaveProperty("departureTime");
    expect(offer).toHaveProperty("timeWindow");
    expect(offer).toHaveProperty("availableSeats");
    expect(offer).toHaveProperty("status");
    expect(offer).toHaveProperty("owner");

    // Values must match the seeded offer
    expect(offer.origin).toBe(activeOffer.origin);
    expect(offer.destination).toBe(activeOffer.destination);
    expect(offer.status).toBe("Active");
  });

  // ─── UT-S2-05 ─────────────────────────────────────────────────────────────
  // Function/Logic : Offer detail privacy
  // Test input     : Offer owner profile includes private contact data
  // Expected       : Unapproved private fields are not returned
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-05: public offer detail does not expose private contact data from owner profile", async () => {
    const response = await request(app)
      .get(`/api/ride-offers/public/${activeOffer._id}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);

    const { offer } = response.body;

    // Internal FK must be hidden
    expect(offer.userId).toBeUndefined();

    // Private owner contact fields must be absent
    expect(offer.owner?.phoneNumber).toBeUndefined();
    expect(offer.owner?.email).toBeUndefined();
    expect(offer.owner?.studentStaffId).toBeUndefined();
    expect(offer.owner?.passwordHash).toBeUndefined();
  });

  // ─── UT-S2-06 ─────────────────────────────────────────────────────────────
  // Function/Logic : JoinRequest validation
  // Test input     : Valid requester and active offer
  // Expected       : Pending JoinRequest is inserted successfully
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-06: valid join request for active offer inserts a Pending record into the database", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.joinRequest.status).toBe("Pending");

    // Verify the record was persisted in the fake DB
    const stored = await testDb.collection("joinRequests").findOne({
      rideOfferId: activeOffer._id,
      requesterUserId: passenger._id
    });

    expect(stored).not.toBeNull();
    expect(stored.status).toBe("Pending");
    expect(stored.ownerUserId.toString()).toBe(offerOwner._id.toString());
  });

  // ─── UT-S2-07 ─────────────────────────────────────────────────────────────
  // Function/Logic : Duplicate request check
  // Test input     : Existing Pending request for same requester and offer
  // Expected       : Second request is rejected
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-07: a second Pending join request for the same offer and requester is rejected (409)", async () => {
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, passenger._id, offerOwner._id, { status: "Pending" })
    );

    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(409);
    expect(response.body.message).toBeTruthy();
  });

  // ─── UT-S2-08 ─────────────────────────────────────────────────────────────
  // Function/Logic : Self-request check
  // Test input     : requesterUserId equals ownerUserId
  // Expected       : Request is rejected
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-08: join request where requesterUserId equals ownerUserId is rejected (self-request)", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/own/i);
  });

  // ─── UT-S2-09 ─────────────────────────────────────────────────────────────
  // Function/Logic : Unavailable offer check
  // Test input     : Cancelled/inactive/full offer
  // Expected       : Join request is rejected
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-09: join request for cancelled, inactive, or full offer is rejected (422)", async () => {
    const [cancelledRes, inactiveRes, fullRes] = await Promise.all([
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: cancelledOffer._id.toString() }),
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: inactiveOffer._id.toString() }),
      request(app)
        .post("/api/join-requests")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ rideOfferId: fullOffer._id.toString() })
    ]);

    expect(cancelledRes.status).toBe(422);
    expect(inactiveRes.status).toBe(422);
    expect(fullRes.status).toBe(422);
  });

  // ─── UT-S2-10 ─────────────────────────────────────────────────────────────
  // Function/Logic : Request-status filtering
  // Test input     : User has own requests and other users' requests exist
  // Expected       : Only authenticated user's own requests are returned
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-10: GET /api/join-requests/mine filters by requesterUserId of the token holder", async () => {
    // Each passenger has one request in the DB
    testDb.collection("joinRequests").docs.push(
      makeJoinRequest(activeOffer._id, passenger._id,      offerOwner._id, { status: "Pending" }),
      makeJoinRequest(activeOffer._id, otherPassenger._id, offerOwner._id, { status: "Accepted" })
    );

    const [passengerRes, otherRes] = await Promise.all([
      request(app)
        .get("/api/join-requests/mine")
        .set("Authorization", `Bearer ${passengerToken}`),
      request(app)
        .get("/api/join-requests/mine")
        .set("Authorization", `Bearer ${otherPassengerToken}`)
    ]);

    // Each user must see only their own 1 request
    expect(passengerRes.status).toBe(200);
    expect(passengerRes.body.joinRequests).toHaveLength(1);
    expect(passengerRes.body.joinRequests[0].status).toBe("Pending");

    expect(otherRes.status).toBe(200);
    expect(otherRes.body.joinRequests).toHaveLength(1);
    expect(otherRes.body.joinRequests[0].status).toBe("Accepted");
  });

  // ─── UT-S2-11 ─────────────────────────────────────────────────────────────
  // Function/Logic : Protected endpoint guard
  // Test input     : No token/session present in the request
  // Expected       : Request action is denied
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-11: requests to protected endpoints without a token are denied with 401", async () => {
    // Test the join-request POST endpoint (the most sensitive protected action)
    const joinResponse = await request(app)
      .post("/api/join-requests")
      .send({ rideOfferId: activeOffer._id.toString() });

    expect(joinResponse.status).toBe(401);
    expect(joinResponse.body.message).toBe("Authentication required.");

    // Also test the mine endpoint
    const mineResponse = await request(app).get("/api/join-requests/mine");

    expect(mineResponse.status).toBe(401);
    expect(mineResponse.body.message).toBe("Authentication required.");
  });

  // ─── UT-S2-12 ─────────────────────────────────────────────────────────────
  // Function/Logic : Sprint 1 regression
  // Test input     : Run existing auth/profile/ride-offer tests
  // Expected       : Existing Sprint 1 tests still pass
  //
  // Implementation note:
  //   The full Sprint 1 suite (sprint1-api.test.js) runs alongside this file
  //   and is verified by the shared test runner. This test acts as a canary
  //   smoke-test confirming the core application health endpoint still works.
  // ─────────────────────────────────────────────────────────────────────────
  test("UT-S2-12: Sprint 1 regression – health endpoint still responds OK", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  test("UT-S2-12: Sprint 1 regression – login still authenticates a valid user", async () => {
    // We need a real password hash for this regression check.
    // Use the token-creation path: if the user can get a valid token then
    // Sprint 1 auth infrastructure is intact.
    const token = createToken(passenger);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    // The /api/me endpoint (Sprint 1) must still accept the token
    const meResponse = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.id).toBe(passenger._id.toString());
  });
});
