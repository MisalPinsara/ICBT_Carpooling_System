/**
 * Sprint 3 Code-Level Test Cases (Table: Sprint 3 code-level test cases)
 * 
 * ┌────────────┬──────────────────┬──────────┬───────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 * │ ID         │ Test method      │ Story    │ Test scenario                                 │ Test setup / action                                                     │ Expected result                                                                                        │
 * ├────────────┼──────────────────┼──────────┼───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 * │ S3-TDD-01  │ TDD / Test-first │ US-09    │ Show only requests received for owned offers  │ Write received-request ownership test before the owner query is impl.   │ Initial run fails; after implementation, only requests for the authenticated owner's offers returned.  │
 * │ S3-TDD-02  │ TDD / Test-first │ US-11/12 │ Accept Pending request with capacity control  │ Write acceptance/capacity test before decision logic.                   │ Initial run fails; after implementation, a valid Pending request is accepted only when capacity exists.│
 * │ S3-UT-01   │ Unit             │ US-11    │ Request status-transition validation          │ Test allowed Pending -> Accepted/Rejected transitions & repeated decs.  │ Only valid Pending transitions succeed; repeated or invalid decisions are rejected.                   │
 * │ S3-UT-02   │ Unit             │ US-12    │ Seat-consistency calculation                  │ Test acceptance, rejection and one-seat boundary conditions.            │ Acceptance reduces seats exactly once; rejection does not consume seats; zero-capacity is blocked.     │
 * │ S3-UT-03   │ Unit             │ US-09-12 │ Decision ownership & request privacy checks   │ Test owner ID/requester ID checks against request records.              │ Only the related offer owner may decide; unrelated users cannot access private request data.           │
 * │ S3-AT-01   │ Automated        │ US-11/12 │ Accept request end-to-end API flow            │ Authenticate owner, accept a Pending request, then retrieve state.      │ Status becomes Accepted, participant data is consistent and available seats decrease exactly once.     │
 * │ S3-AT-02   │ Automated        │ US-11/12 │ Reject request without seat consumption       │ Authenticate owner, reject a Pending request, then retrieve offer state.│ Status becomes Rejected and seat count remains unchanged.                                              │
 * │ S3-AT-03   │ Automated        │ US-09-12 │ Protected decision endpoint security          │ Attempt a decision as a non-owner and without authentication.           │ Both invalid access attempts are denied and no request/seat state is changed.                          │
 * └────────────┴──────────────────┴──────────┴───────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 */

import { jest } from "@jest/globals";
import { ObjectId } from "mongodb";
import request from "supertest";

// ── In-Memory Database Simulator for Jest ─────────────────────────────────────

class FakeCursor {
  constructor(docs) {
    this.docs = [...docs];
  }

  sort(sortSpec) {
    const [[field, direction]] = Object.entries(sortSpec);
    this.docs.sort((left, right) => {
      const leftVal = left[field] instanceof Date ? left[field].getTime() : left[field];
      const rightVal = right[field] instanceof Date ? right[field].getTime() : right[field];
      if (leftVal === rightVal) return 0;
      return leftVal > rightVal ? direction : -direction;
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

function getValue(doc, key) {
  return key.split(".").reduce((value, part) => value?.[part], doc);
}

function valuesEqual(left, right) {
  if (left instanceof ObjectId || right instanceof ObjectId) {
    return left?.toString() === right?.toString();
  }
  return left === right;
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or" && Array.isArray(expected)) {
      return expected.some((subFilter) => matchesFilter(doc, subFilter));
    }
    if (key === "$and" && Array.isArray(expected)) {
      return expected.every((subFilter) => matchesFilter(doc, subFilter));
    }
    const actual = getValue(doc, key);
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.some((value) => valuesEqual(actual, value));
    }
    if (expected && typeof expected === "object" && "$ne" in expected) {
      return !valuesEqual(actual, expected.$ne);
    }
    if (expected && typeof expected === "object" && "$gt" in expected) {
      return actual > expected.$gt;
    }
    if (expected && typeof expected === "object" && "$regex" in expected) {
      const flags = expected.$options || "";
      return new RegExp(expected.$regex, flags).test(actual);
    }
    return valuesEqual(actual, expected);
  });
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
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        doc[key] = (Number(doc[key]) || 0) + Number(value);
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async countDocuments(filter = {}) {
    return this.docs.filter((doc) => matchesFilter(doc, filter)).length;
  }
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

// ── App & Mock Setup ──────────────────────────────────────────────────────────

let testDb;

jest.unstable_mockModule("../db.js", () => ({
  connectToDatabase: jest.fn(async () => testDb),
  closeDatabase: jest.fn()
}));

const { createApp } = await import("../app.js");
const { createToken } = await import("../auth.js");

const app = createApp();

// ── Factory Helpers ───────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    name: "Kasun Fernando",
    email: "kasun.fernando@icbt.lk",
    passwordHash: "hashed_password",
    role: "User",
    createdAt: new Date(),
    ...overrides
  };
}

function makeProfile(userId, overrides = {}) {
  return {
    _id: new ObjectId(),
    userId,
    firstName: "Kasun",
    lastName: "Fernando",
    phoneNumber: "0771234567",
    studentStaffId: "ICBT2026TEST",
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
    destination: "ICBT Colombo Campus",
    departureDate: "2026-09-01",
    departureTime: "07:30 AM",
    timeWindow: "07:00 AM - 08:00 AM",
    availableSeats: 3,
    acceptedPassengers: 0,
    status: "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
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
    requestNote: "Requesting to join the ride to ICBT",
    requestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// ── Sprint 3 Code-Level Test Suite ────────────────────────────────────────────

describe("Sprint 3 Code-Level Test Cases", () => {
  let offerOwner;
  let otherOwner;
  let requester;
  let otherRequester;

  let ownerToken;
  let otherOwnerToken;
  let requesterToken;
  let otherRequesterToken;

  let activeOffer;
  let zeroSeatOffer;

  beforeEach(() => {
    offerOwner = makeUser({ name: "Kasun Fernando", email: "kasun.fernando@icbt.lk" });
    otherOwner = makeUser({ name: "Ravi Jayasuriya", email: "ravi.jayasuriya@icbt.lk" });
    requester = makeUser({ name: "Nethmi Perera", email: "nethmi.perera@icbt.lk" });
    otherRequester = makeUser({ name: "Malith Silva", email: "malith.silva@icbt.lk" });

    ownerToken = createToken(offerOwner);
    otherOwnerToken = createToken(otherOwner);
    requesterToken = createToken(requester);
    otherRequesterToken = createToken(otherRequester);

    activeOffer = makeOffer(offerOwner._id, { availableSeats: 2, acceptedPassengers: 0 });
    zeroSeatOffer = makeOffer(offerOwner._id, { availableSeats: 0, acceptedPassengers: 3 });

    testDb = createFakeDb({
      users: [offerOwner, otherOwner, requester, otherRequester],
      profiles: [
        makeProfile(offerOwner._id, { firstName: "Kasun", lastName: "Fernando", phoneNumber: "0771112233" }),
        makeProfile(otherOwner._id, { firstName: "Ravi", lastName: "Jayasuriya", phoneNumber: "0772223344" }),
        makeProfile(requester._id, { firstName: "Nethmi", lastName: "Perera", phoneNumber: "0773334455" }),
        makeProfile(otherRequester._id, { firstName: "Malith", lastName: "Silva", phoneNumber: "0774445566" })
      ],
      rideOffers: [activeOffer, zeroSeatOffer],
      joinRequests: [],
      activities: []
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. S3-TDD-01 | TDD / Test-first | US-09
  // Scenario: Show only requests received for owned offers
  // Action: Write received-request ownership test before the owner query is implemented.
  // Expected: Initial run fails; after implementation, only requests for the authenticated owner's offers are returned.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-TDD-01: Show only requests received for owned offers (US-09)", async () => {
    // Setup: Create request for owner's offer and request for another owner's offer
    const ownedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id);
    const otherOffer = makeOffer(otherOwner._id);
    const otherRequest = makeJoinRequest(otherOffer._id, requester._id, otherOwner._id);

    testDb.collection("rideOffers").docs.push(otherOffer);
    testDb.collection("joinRequests").docs.push(ownedRequest, otherRequest);

    // Action: Authenticated owner fetches received requests
    const res = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    // Expected: Only requests belonging to the authenticated owner's offers are returned
    expect(res.status).toBe(200);
    expect(res.body.joinRequests).toBeInstanceOf(Array);
    expect(res.body.joinRequests).toHaveLength(1);
    expect(res.body.joinRequests[0].id).toBe(ownedRequest._id.toString());
    expect(res.body.joinRequests[0].ownerUserId).toBe(offerOwner._id.toString());
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. S3-TDD-02 | TDD / Test-first | US-11/12
  // Scenario: Accept Pending request with capacity control
  // Action: Write acceptance/capacity test before decision logic.
  // Expected: Initial run fails; after implementation, a valid Pending request is accepted only when capacity exists.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-TDD-02: Accept Pending request with capacity control (US-11/12)", async () => {
    // Sub-case A: Capacity exists -> Pending request is accepted successfully
    const validPendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(validPendingRequest);

    const acceptRes = await request(app)
      .patch(`/api/join-requests/${validPendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted", decisionNote: "Confirmed" });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.joinRequest.status).toBe("Accepted");

    // Sub-case B: Zero capacity -> Acceptance is blocked with capacity error
    const zeroCapacityRequest = makeJoinRequest(zeroSeatOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(zeroCapacityRequest);

    const zeroCapacityRes = await request(app)
      .patch(`/api/join-requests/${zeroCapacityRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(zeroCapacityRes.status).toBe(422);
    expect(zeroCapacityRes.body.message).toMatch(/seats/i);
    expect(zeroCapacityRequest.status).toBe("Pending");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. S3-UT-01 | Unit | US-11
  // Scenario: Request status-transition validation
  // Action: Test allowed Pending -> Accepted/Rejected transitions and repeated decisions.
  // Expected: Only valid Pending transitions succeed; repeated or invalid decisions are rejected.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-UT-01: Request status-transition validation (US-11)", async () => {
    // 1. Pending -> Accepted transition succeeds
    const pendingReq1 = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq1);

    const acceptRes = await request(app)
      .patch(`/api/join-requests/${pendingReq1._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.joinRequest.status).toBe("Accepted");

    // 2. Pending -> Rejected transition succeeds
    const pendingReq2 = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq2);

    const rejectRes = await request(app)
      .patch(`/api/join-requests/${pendingReq2._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.joinRequest.status).toBe("Rejected");

    // 3. Repeated decision on already decided (Accepted) request is rejected
    const repeatOnAccepted = await request(app)
      .patch(`/api/join-requests/${pendingReq1._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(repeatOnAccepted.status).toBe(422);
    expect(repeatOnAccepted.body.message).toMatch(/already been decided/i);
    expect(pendingReq1.status).toBe("Accepted");

    // 4. Repeated decision on already decided (Rejected) request is rejected
    const repeatOnRejected = await request(app)
      .patch(`/api/join-requests/${pendingReq2._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(repeatOnRejected.status).toBe(422);
    expect(repeatOnRejected.body.message).toMatch(/already been decided/i);
    expect(pendingReq2.status).toBe("Rejected");

    // 5. Invalid transition status is rejected by validator
    const invalidPendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(invalidPendingReq);

    const invalidRes = await request(app)
      .patch(`/api/join-requests/${invalidPendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "InvalidStatus" });

    expect(invalidRes.status).toBe(400);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. S3-UT-02 | Unit | US-12
  // Scenario: Seat-consistency calculation
  // Action: Test acceptance, rejection and one-seat boundary conditions.
  // Expected: Acceptance reduces seats exactly once; rejection does not consume seats; zero-capacity acceptance is blocked.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-UT-02: Seat-consistency calculation (US-12)", async () => {
    // 1. Acceptance reduces availableSeats exactly once
    const offerWithTwoSeats = makeOffer(offerOwner._id, { availableSeats: 2, acceptedPassengers: 0 });
    const req1 = makeJoinRequest(offerWithTwoSeats._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("rideOffers").docs.push(offerWithTwoSeats);
    testDb.collection("joinRequests").docs.push(req1);

    const acceptRes1 = await request(app)
      .patch(`/api/join-requests/${req1._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(acceptRes1.status).toBe(200);
    expect(offerWithTwoSeats.availableSeats).toBe(1);
    expect(offerWithTwoSeats.acceptedPassengers).toBe(1);

    // 2. Rejection does not consume seats
    const req2 = makeJoinRequest(offerWithTwoSeats._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(req2);

    const rejectRes = await request(app)
      .patch(`/api/join-requests/${req2._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(rejectRes.status).toBe(200);
    expect(offerWithTwoSeats.availableSeats).toBe(1);
    expect(offerWithTwoSeats.acceptedPassengers).toBe(1);

    // 3. One-seat boundary condition: Accepting when seats = 1 reaches exactly 0
    const req3 = makeJoinRequest(offerWithTwoSeats._id, makeUser()._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(req3);

    const acceptRes2 = await request(app)
      .patch(`/api/join-requests/${req3._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(acceptRes2.status).toBe(200);
    expect(offerWithTwoSeats.availableSeats).toBe(0);
    expect(offerWithTwoSeats.acceptedPassengers).toBe(2);

    // 4. Zero-capacity acceptance is blocked (seats never negative)
    const req4 = makeJoinRequest(offerWithTwoSeats._id, makeUser()._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(req4);

    const blockedRes = await request(app)
      .patch(`/api/join-requests/${req4._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(blockedRes.status).toBe(422);
    expect(offerWithTwoSeats.availableSeats).toBe(0);
    expect(req4.status).toBe("Pending");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. S3-UT-03 | Unit | US-09-12
  // Scenario: Decision ownership and request privacy checks
  // Action: Test owner ID/requester ID checks against request records.
  // Expected: Only the related offer owner may decide; unrelated users cannot access private request data.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-UT-03: Decision ownership and request privacy checks (US-09-12)", async () => {
    const ownerReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(ownerReq);

    // 1. Only the related offer owner may decide: Non-owner decision is rejected with 403
    const nonOwnerDecision = await request(app)
      .patch(`/api/join-requests/${ownerReq._id}/decision`)
      .set("Authorization", `Bearer ${otherOwnerToken}`)
      .send({ status: "Accepted" });

    expect(nonOwnerDecision.status).toBe(403);
    expect(nonOwnerDecision.body.message).toMatch(/own/i);
    expect(ownerReq.status).toBe("Pending");

    // 2. Requester privacy: Authenticated requester only accesses own submitted requests
    const otherUserReq = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(otherUserReq);

    const requesterMineRes = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(requesterMineRes.status).toBe(200);
    expect(requesterMineRes.body.joinRequests).toHaveLength(1);
    expect(requesterMineRes.body.joinRequests[0].id).toBe(ownerReq._id.toString());
    expect(requesterMineRes.body.joinRequests[0].requesterUserId).toBe(requester._id.toString());

    // 3. Unrelated requester cannot access another user's single join request record
    const unauthorizedAccessRes = await request(app)
      .get(`/api/join-requests/${ownerReq._id}`)
      .set("Authorization", `Bearer ${otherRequesterToken}`);

    expect(unauthorizedAccessRes.status).toBe(403);
    expect(unauthorizedAccessRes.body.message).toMatch(/own/i);

    // 4. Non-owner cannot access accepted participants list of another user's offer
    const nonOwnerAcceptedPassengers = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}/accepted-passengers`)
      .set("Authorization", `Bearer ${otherOwnerToken}`);

    expect(nonOwnerAcceptedPassengers.status).toBe(403);
    expect(nonOwnerAcceptedPassengers.body.message).toMatch(/own/i);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. S3-AT-01 | Automated | US-11/12
  // Scenario: Accept request end-to-end API flow
  // Action: Authenticate owner, accept a Pending request, then retrieve request and offer state.
  // Expected: Status becomes Accepted, participant data is consistent and available seats decrease exactly once.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-AT-01: Accept request end-to-end API flow (US-11/12)", async () => {
    // 1. Initial State: Active offer with 2 seats, 1 Pending join request
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Pending",
      requestNote: "Daily commute to ICBT"
    });
    testDb.collection("joinRequests").docs.push(pendingReq);

    // 2. Owner Authenticates and Accepts the Pending Request
    const decisionRes = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted", decisionNote: "Confirmed seat for tomorrow" });

    expect(decisionRes.status).toBe(200);
    expect(decisionRes.body.joinRequest.status).toBe("Accepted");
    expect(decisionRes.body.joinRequest.decidedAt).toBeDefined();
    expect(decisionRes.body.joinRequest.decisionNote).toBe("Confirmed seat for tomorrow");

    // 3. Retrieve request state via GET /api/join-requests/:id
    const requestStateRes = await request(app)
      .get(`/api/join-requests/${pendingReq._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(requestStateRes.status).toBe(200);
    expect(requestStateRes.body.joinRequest.status).toBe("Accepted");
    expect(requestStateRes.body.joinRequest.requester.name).toBe("Nethmi Perera");

    // 4. Retrieve offer state via GET /api/ride-offers/:id
    const offerStateRes = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(offerStateRes.status).toBe(200);
    expect(offerStateRes.body.offer.availableSeats).toBe(1); // Decreased from 2 to 1
    expect(offerStateRes.body.offer.acceptedPassengers).toBe(1);

    // 5. Retrieve accepted passengers list via GET /api/ride-offers/:id/accepted-passengers
    const acceptedListRes = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}/accepted-passengers`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(acceptedListRes.status).toBe(200);
    expect(acceptedListRes.body.passengers).toHaveLength(1);
    expect(acceptedListRes.body.passengers[0].id).toBe(requester._id.toString());
    expect(acceptedListRes.body.passengers[0].name).toBe("Nethmi Perera");
    expect(acceptedListRes.body.passengers[0].status).toBe("Accepted");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. S3-AT-02 | Automated | US-11/12
  // Scenario: Reject request without seat consumption
  // Action: Authenticate owner, reject a Pending request, then retrieve offer state.
  // Expected: Status becomes Rejected and seat count remains unchanged.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-AT-02: Reject request without seat consumption (US-11/12)", async () => {
    // 1. Initial State: Active offer with 2 seats, 1 Pending join request
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Pending",
      requestNote: "Need a ride from Panadura"
    });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const initialSeats = activeOffer.availableSeats; // 2

    // 2. Owner Authenticates and Rejects the Pending Request
    const rejectRes = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected", decisionNote: "Route is not convenient" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.joinRequest.status).toBe("Rejected");
    expect(rejectRes.body.joinRequest.decidedAt).toBeDefined();

    // 3. Retrieve offer state to verify seats are not consumed
    const offerStateRes = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(offerStateRes.status).toBe(200);
    expect(offerStateRes.body.offer.availableSeats).toBe(initialSeats); // Unchanged: 2
    expect(offerStateRes.body.offer.acceptedPassengers).toBe(0);

    // 4. Verify accepted passengers list remains empty
    const acceptedListRes = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}/accepted-passengers`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(acceptedListRes.status).toBe(200);
    expect(acceptedListRes.body.passengers).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. S3-AT-03 | Automated | US-09-12
  // Scenario: Protected decision endpoint security
  // Action: Attempt a decision as a non-owner and without authentication.
  // Expected: Both invalid access attempts are denied and no request/seat state is changed.
  // ─────────────────────────────────────────────────────────────────────────────
  test("S3-AT-03: Protected decision endpoint security (US-09-12)", async () => {
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const initialSeats = activeOffer.availableSeats; // 2

    // Attempt 1: Without authentication token
    const unauthenticatedRes = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .send({ status: "Accepted" });

    expect(unauthenticatedRes.status).toBe(401);
    expect(unauthenticatedRes.body.message).toBe("Authentication required.");

    // Attempt 2: As a non-owner
    const nonOwnerRes = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${otherOwnerToken}`)
      .send({ status: "Accepted" });

    expect(nonOwnerRes.status).toBe(403);
    expect(nonOwnerRes.body.message).toMatch(/own/i);

    // Verify DB state is strictly unchanged
    const currentReq = await testDb.collection("joinRequests").findOne({ _id: pendingReq._id });
    expect(currentReq.status).toBe("Pending");
    expect(currentReq.decidedAt).toBeUndefined();

    const currentOffer = await testDb.collection("rideOffers").findOne({ _id: activeOffer._id });
    expect(currentOffer.availableSeats).toBe(initialSeats);
    expect(currentOffer.acceptedPassengers).toBe(0);
  });
});
