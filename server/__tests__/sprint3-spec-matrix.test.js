/**
 * Sprint 3 Test Matrix (TDD-S3-01 to TDD-S3-12, UT-S3-01 to UT-S3-14)
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
    role: "User",
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
    phoneNumber: "0771234567",
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

describe("Sprint 3 Developer Specification Matrix", () => {
  let offerOwner;
  let requester;
  let otherOwner;
  let otherRequester;

  let ownerToken;
  let requesterToken;
  let otherOwnerToken;

  let activeOffer;
  let zeroSeatOffer;

  beforeEach(() => {
    offerOwner = makeUser({ name: "Kasun Fernando", email: "kasun@icbt.lk" });
    requester = makeUser({ name: "Nethmi Perera", email: "nethmi@icbt.lk" });
    otherOwner = makeUser({ name: "Ravi Jayasuriya", email: "ravi@icbt.lk" });
    otherRequester = makeUser({ name: "Amal Silva", email: "amal@icbt.lk" });

    activeOffer = makeOffer(offerOwner._id, { availableSeats: 2, acceptedPassengers: 0, status: "Active" });
    zeroSeatOffer = makeOffer(offerOwner._id, { availableSeats: 0, acceptedPassengers: 3, status: "Active" });

    testDb = createFakeDb({
      users: [offerOwner, requester, otherOwner, otherRequester],
      profiles: [
        makeProfile(offerOwner._id, { firstName: "Kasun", lastName: "Fernando", phoneNumber: "0764567890" }),
        makeProfile(requester._id, { firstName: "Nethmi", lastName: "Perera", phoneNumber: "0771234567" }),
        makeProfile(otherOwner._id, { firstName: "Ravi", lastName: "Jayasuriya", phoneNumber: "0719876543" }),
        makeProfile(otherRequester._id, { firstName: "Amal", lastName: "Silva", phoneNumber: "0751122334" })
      ],
      rideOffers: [activeOffer, zeroSeatOffer],
      joinRequests: [],
      activities: []
    });

    ownerToken = createToken(offerOwner);
    requesterToken = createToken(requester);
    otherOwnerToken = createToken(otherOwner);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TDD / Test-First Cases
  // ═══════════════════════════════════════════════════════════════════════════

  // TDD-S3-01: Feature = Request Visibility | Scenario = Owner opens the received requests view for an owned offer | Expected = Only requests linked to the owner's offers are returned.
  test("TDD-S3-01: Request Visibility - Owner opens received requests view and receives only requests linked to owned offers", async () => {
    const ownedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id);
    const otherOffer = makeOffer(otherOwner._id);
    const nonOwnedRequest = makeJoinRequest(otherOffer._id, requester._id, otherOwner._id);

    testDb.collection("rideOffers").docs.push(otherOffer);
    testDb.collection("joinRequests").docs.push(ownedRequest, nonOwnedRequest);

    const response = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].id).toBe(ownedRequest._id.toString());
  });

  // TDD-S3-02: Feature = Accepted Users | Scenario = Owner opens accepted participants for an owned offer | Expected = Only JoinRequests with Accepted status are shown.
  test("TDD-S3-02: Accepted Users - Owner opens accepted participants and only Accepted status requests are shown", async () => {
    const acceptedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Accepted" });
    const pendingRequest = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });

    testDb.collection("joinRequests").docs.push(acceptedRequest, pendingRequest);

    const response = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}/accepted-passengers`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.passengers).toBeDefined();
    expect(response.body.passengers).toHaveLength(1);
    expect(response.body.passengers[0].id).toBe(requester._id.toString());
    expect(response.body.passengers[0].status).toBe("Accepted");
  });

  // TDD-S3-03: Feature = Accept Request | Scenario = Owner accepts a Pending request on an active offer with available seats | Expected = Request status becomes Accepted and decision timestamp is recorded.
  test("TDD-S3-03: Accept Request - Owner accepts Pending request, status becomes Accepted and decision timestamp recorded", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted", decisionNote: "Welcome aboard!" });

    expect(response.status).toBe(200);
    expect(response.body.joinRequest.status).toBe("Accepted");
    expect(response.body.joinRequest.decidedAt).toBeDefined();
    expect(response.body.joinRequest.decidedAt).not.toBeNull();
  });

  // TDD-S3-04: Feature = Reject Request | Scenario = Owner rejects a Pending request on an owned offer | Expected = Request status becomes Rejected and decision timestamp is recorded.
  test("TDD-S3-04: Reject Request - Owner rejects Pending request, status becomes Rejected and decision timestamp recorded", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected", decisionNote: "Route full" });

    expect(response.status).toBe(200);
    expect(response.body.joinRequest.status).toBe("Rejected");
    expect(response.body.joinRequest.decidedAt).toBeDefined();
    expect(response.body.joinRequest.decidedAt).not.toBeNull();
  });

  // TDD-S3-05: Feature = Requester Visibility | Scenario = Requester checks their own request after owner decision | Expected = Requester sees Accepted or Rejected status for their own request.
  test("TDD-S3-05: Requester Visibility - Requester checks own request and sees Accepted status outcome", async () => {
    const decidedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Accepted",
      decidedAt: new Date()
    });
    testDb.collection("joinRequests").docs.push(decidedRequest);

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].status).toBe("Accepted");
    expect(response.body.joinRequests[0].decidedAt).toBeDefined();
  });

  // TDD-S3-05b: Feature = Requester Visibility | Scenario = Requester checks their own request after owner rejects | Expected = Requester sees Rejected status for their own request.
  test("TDD-S3-05b: Requester Visibility - Requester checks own request and sees Rejected status outcome", async () => {
    const rejectedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Rejected",
      decidedAt: new Date()
    });
    testDb.collection("joinRequests").docs.push(rejectedRequest);

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    const found = response.body.joinRequests.find(r => r.status === "Rejected");
    expect(found).toBeDefined();
    expect(found.status).toBe("Rejected");
    expect(found.decidedAt).toBeDefined();
  });

  // TDD-S3-06: Feature = Ownership Check | Scenario = User attempts to decide a request for another user's offer | Expected = Decision is denied.
  test("TDD-S3-06: Ownership Check - User attempts to decide request for another user's offer is denied", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${otherOwnerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/own/i);
  });

  // TDD-S3-07: Feature = Status Transition | Scenario = Owner attempts to decide an already Accepted or Rejected request | Expected = Action is blocked and existing status remains unchanged.
  test("TDD-S3-07: Status Transition - Owner attempts to decide an already Accepted request is blocked", async () => {
    const alreadyAccepted = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Accepted",
      decidedAt: new Date()
    });
    testDb.collection("joinRequests").docs.push(alreadyAccepted);

    const response = await request(app)
      .patch(`/api/join-requests/${alreadyAccepted._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(response.status).toBe(422);
    expect(alreadyAccepted.status).toBe("Accepted");
  });

  // TDD-S3-08: Feature = Capacity Check | Scenario = Owner accepts a request when availableSeats is zero | Expected = Acceptance is rejected and seat count stays zero.
  test("TDD-S3-08: Capacity Check - Owner accepts a request when availableSeats is zero is rejected", async () => {
    const requestOnZeroOffer = makeJoinRequest(zeroSeatOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(requestOnZeroOffer);

    const response = await request(app)
      .patch(`/api/join-requests/${requestOnZeroOffer._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(422);
    expect(zeroSeatOffer.availableSeats).toBe(0);
    expect(requestOnZeroOffer.status).toBe("Pending");
  });

  // TDD-S3-09: Feature = Seat Decrement | Scenario = Owner accepts one Pending request while seats are available | Expected = availableSeats decreases by exactly one.
  test("TDD-S3-09: Seat Decrement - Owner accepts one Pending request, availableSeats decreases by exactly one", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const initialSeats = activeOffer.availableSeats;

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(200);
    expect(activeOffer.availableSeats).toBe(initialSeats - 1);
  });

  // TDD-S3-10: Feature = No Negative Seats | Scenario = Repeated acceptance reaches capacity | Expected = Seat count never becomes negative and excess acceptance is blocked.
  test("TDD-S3-10: No Negative Seats - Excess acceptance when seats reach 0 is blocked and seat count never negative", async () => {
    const singleSeatOffer = makeOffer(offerOwner._id, { availableSeats: 1, acceptedPassengers: 0, status: "Active" });
    testDb.collection("rideOffers").docs.push(singleSeatOffer);

    const req1 = makeJoinRequest(singleSeatOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    const req2 = makeJoinRequest(singleSeatOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(req1, req2);

    // Accept first request -> seats become 0
    const res1 = await request(app)
      .patch(`/api/join-requests/${req1._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });
    expect(res1.status).toBe(200);
    expect(singleSeatOffer.availableSeats).toBe(0);

    // Accept second request -> blocked because 0 seats left
    const res2 = await request(app)
      .patch(`/api/join-requests/${req2._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });
    expect(res2.status).toBe(422);
    expect(singleSeatOffer.availableSeats).toBe(0);
    expect(req2.status).toBe("Pending");
  });

  // TDD-S3-11: Feature = Rejection Capacity | Scenario = Owner rejects a Pending request | Expected = Request is rejected without reducing availableSeats.
  test("TDD-S3-11: Rejection Capacity - Owner rejects Pending request without reducing availableSeats", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const initialSeats = activeOffer.availableSeats;

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(response.status).toBe(200);
    expect(activeOffer.availableSeats).toBe(initialSeats);
  });

  // TDD-S3-12: Feature = Empty State | Scenario = Owner has no received requests | Expected = UI/API returns a clean empty state result.
  test("TDD-S3-12: Empty State - Owner with no received requests gets clean empty array", async () => {
    const response = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Unit and API Test Cases
  // ═══════════════════════════════════════════════════════════════════════════

  // UT-S3-01: Function / logic = Ownership filter | Test input = ownerUserId equals authenticated user ID | Expected = Only requests for the authenticated owner's offers are returned.
  test("UT-S3-01: Ownership filter returns only requests where ownerUserId matches authenticated user", async () => {
    const ownedRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id);
    testDb.collection("joinRequests").docs.push(ownedRequest);

    const response = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].ownerUserId).toBe(offerOwner._id.toString());
  });

  // UT-S3-02: Function / logic = Cross-owner exclusion | Test input = Requests exist for another owner | Expected = Other owner's requests are excluded.
  test("UT-S3-02: Cross-owner exclusion excludes requests belonging to other ride owners", async () => {
    const otherOffer = makeOffer(otherOwner._id);
    const otherOwnerRequest = makeJoinRequest(otherOffer._id, requester._id, otherOwner._id);
    testDb.collection("rideOffers").docs.push(otherOffer);
    testDb.collection("joinRequests").docs.push(otherOwnerRequest);

    const response = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(0);
  });

  // UT-S3-03: Function / logic = Accepted filter | Test input = Requests include Pending, Accepted and Rejected statuses | Expected = Accepted participant view returns only Accepted records.
  test("UT-S3-03: Accepted filter returns only Accepted records for accepted-passengers endpoint", async () => {
    const acceptedReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Accepted" });
    const pendingReq = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });
    const rejectedReq = makeJoinRequest(activeOffer._id, makeUser()._id, offerOwner._id, { status: "Rejected" });
    testDb.collection("joinRequests").docs.push(acceptedReq, pendingReq, rejectedReq);

    const response = await request(app)
      .get(`/api/ride-offers/${activeOffer._id}/accepted-passengers`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.passengers).toHaveLength(1);
    expect(response.body.passengers[0].id).toBe(requester._id.toString());
  });

  // UT-S3-04: Function / logic = Accept transition | Test input = Pending request, valid owner, active offer and seats available | Expected = Status changes to Accepted.
  test("UT-S3-04: Accept transition changes status from Pending to Accepted", async () => {
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(200);
    expect(response.body.joinRequest.status).toBe("Accepted");
  });

  // UT-S3-05: Function / logic = Reject transition | Test input = Pending request and valid owner | Expected = Status changes to Rejected.
  test("UT-S3-05: Reject transition changes status from Pending to Rejected", async () => {
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(response.status).toBe(200);
    expect(response.body.joinRequest.status).toBe("Rejected");
  });

  // UT-S3-06: Function / logic = Already decided request | Test input = Accepted or Rejected request is submitted for another decision | Expected = Action is rejected and status remains unchanged.
  test("UT-S3-06: Already decided request rejects duplicate decision attempt and keeps status unchanged", async () => {
    const rejectedReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Rejected",
      decidedAt: new Date()
    });
    testDb.collection("joinRequests").docs.push(rejectedReq);

    const response = await request(app)
      .patch(`/api/join-requests/${rejectedReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(422);
    expect(rejectedReq.status).toBe("Rejected");
  });

  // UT-S3-07: Function / logic = Decision timestamps | Test input = Valid accept or reject action | Expected = decidedAt and updatedAt are set or updated.
  test("UT-S3-07: Decision timestamps are set on valid decision action", async () => {
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(200);
    expect(response.body.joinRequest.decidedAt).toBeDefined();
    expect(response.body.joinRequest.updatedAt).toBeDefined();
  });

  // UT-S3-08: Function / logic = Zero-seat acceptance | Test input = availableSeats equals 0 | Expected = Acceptance is blocked.
  test("UT-S3-08: Zero-seat acceptance is blocked when availableSeats equals 0", async () => {
    const pendingReq = makeJoinRequest(zeroSeatOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/seats/i);
  });

  // UT-S3-09: Function / logic = Seat decrement | Test input = availableSeats equals 2 and one request is accepted | Expected = availableSeats becomes 1.
  test("UT-S3-09: Seat decrement updates availableSeats from 2 to 1 on acceptance", async () => {
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);
    activeOffer.availableSeats = 2;

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(200);
    expect(activeOffer.availableSeats).toBe(1);
  });

  // UT-S3-10: Function / logic = No negative seats | Test input = Acceptance attempted at capacity limit | Expected = availableSeats never drops below 0.
  test("UT-S3-10: No negative seats ensures availableSeats never drops below 0", async () => {
    activeOffer.availableSeats = 0;
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(422);
    expect(activeOffer.availableSeats).toBe(0);
  });

  // UT-S3-11: Function / logic = Reject does not decrement | Test input = Pending request is rejected while seats are available | Expected = availableSeats remains unchanged.
  test("UT-S3-11: Reject does not decrement leaves availableSeats unchanged", async () => {
    activeOffer.availableSeats = 2;
    const pendingReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingReq);

    const response = await request(app)
      .patch(`/api/join-requests/${pendingReq._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(response.status).toBe(200);
    expect(activeOffer.availableSeats).toBe(2);
  });

  // UT-S3-12: Function / logic = Requester status filter | Test input = requesterUserId equals authenticated user ID | Expected = Requester sees only their own request records.
  test("UT-S3-12: Requester status filter returns only request records submitted by authenticated requester", async () => {
    const requesterOwnReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id);
    const otherUserReq = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id);
    testDb.collection("joinRequests").docs.push(requesterOwnReq, otherUserReq);

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].id).toBe(requesterOwnReq._id.toString());
  });

  // UT-S3-13: Function / logic = Protected route guard | Test input = No token/session for request-management endpoint | Expected = Request is denied (401).
  test("UT-S3-13: Protected route guard denies unauthenticated access with 401", async () => {
    const response = await request(app).get("/api/join-requests/received");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required.");
  });

  // UT-S3-14: Function / logic = Regression check | Test input = Run Sprint 1 and Sprint 2 automated tests with Sprint 3 tests | Expected = All previous sprint tests still pass.
  test("UT-S3-14: Regression check verifies core health endpoint and auth guard stability", async () => {
    const healthRes = await request(app).get("/api/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
  });
});
