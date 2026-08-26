/**
 * Sprint 3 Automated Testing Matrix (Section 14: AUTO-01 to AUTO-08)
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

// ── Test Data Helpers ────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    name: "Test User",
    email: "user@icbt.lk",
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
    firstName: "Test",
    lastName: "User",
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
    origin: "Panadura",
    destination: "ICBT Campus",
    departureDate: "Tomorrow",
    departureTime: "7:00 AM",
    timeWindow: "7:00 AM - 8:00 AM",
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
    requestNote: "Looking to carpool tomorrow morning",
    requestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

describe("Section 14: Sprint 3 Automated Testing Matrix", () => {
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
    offerOwner = makeUser({ name: "Driver Kasun", email: "kasun.driver@icbt.lk" });
    otherOwner = makeUser({ name: "Driver Ravi", email: "ravi.driver@icbt.lk" });
    requester = makeUser({ name: "Passenger Nethmi", email: "nethmi.passenger@icbt.lk" });
    otherRequester = makeUser({ name: "Passenger Malith", email: "malith.passenger@icbt.lk" });

    ownerToken = createToken(offerOwner);
    otherOwnerToken = createToken(otherOwner);
    requesterToken = createToken(requester);
    otherRequesterToken = createToken(otherRequester);

    activeOffer = makeOffer(offerOwner._id, { availableSeats: 3, acceptedPassengers: 0 });
    zeroSeatOffer = makeOffer(offerOwner._id, { availableSeats: 0, acceptedPassengers: 3 });

    testDb = createFakeDb({
      users: [offerOwner, otherOwner, requester, otherRequester],
      profiles: [
        makeProfile(offerOwner._id, { firstName: "Kasun", lastName: "Fernando" }),
        makeProfile(otherOwner._id, { firstName: "Ravi", lastName: "Jayasuriya" }),
        makeProfile(requester._id, { firstName: "Nethmi", lastName: "Perera" }),
        makeProfile(otherRequester._id, { firstName: "Malith", lastName: "De Silva" })
      ],
      rideOffers: [activeOffer, zeroSeatOffer],
      joinRequests: []
    });
  });

  // ── AUTO-01: Owned-request filtering ──────────────────────────────────────────
  test("AUTO-01: Owned-request filtering - Only owner's requests returned", async () => {
    const ownerReq1 = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id);
    const otherOffer = makeOffer(otherOwner._id);
    const otherReq = makeJoinRequest(otherOffer._id, otherRequester._id, otherOwner._id);

    testDb.collection("rideOffers").docs.push(otherOffer);
    testDb.collection("joinRequests").docs.push(ownerReq1, otherReq);

    const response = await request(app)
      .get("/api/join-requests/received")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toBeInstanceOf(Array);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].id).toBe(ownerReq1._id.toString());
    expect(response.body.joinRequests[0].ownerUserId).toBe(offerOwner._id.toString());
  });

  // ── AUTO-02: Cross-owner denial ───────────────────────────────────────────────
  test("AUTO-02: Cross-owner denial - Other owner's data/decision action denied", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    // Other owner attempts to decide a request belonging to offerOwner
    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${otherOwnerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/own/i);
    expect(pendingRequest.status).toBe("Pending");
  });

  // ── AUTO-03: Pending accept transition ─────────────────────────────────────────
  test("AUTO-03: Pending accept transition - Valid Pending request becomes Accepted", async () => {
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
    expect(response.body.joinRequest.decisionNote).toBe("Welcome aboard!");
  });

  // ── AUTO-04: Pending reject transition ─────────────────────────────────────────
  test("AUTO-04: Pending reject transition - Valid Pending request becomes Rejected", async () => {
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
    expect(response.body.joinRequest.decisionNote).toBe("Route full");
  });

  // ── AUTO-05: Repeated decision ────────────────────────────────────────────────
  test("AUTO-05: Repeated decision - Second decision attempt is rejected", async () => {
    const alreadyAccepted = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, {
      status: "Accepted",
      decidedAt: new Date()
    });
    testDb.collection("joinRequests").docs.push(alreadyAccepted);

    // Attempting a second decision on already decided request must be blocked
    const response = await request(app)
      .patch(`/api/join-requests/${alreadyAccepted._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Rejected" });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/already been decided/i);
    expect(alreadyAccepted.status).toBe("Accepted");
  });

  // ── AUTO-06: Capacity boundary ────────────────────────────────────────────────
  test("AUTO-06: Capacity boundary - Acceptance at zero seats is rejected", async () => {
    const reqOnZeroSeats = makeJoinRequest(zeroSeatOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(reqOnZeroSeats);

    const response = await request(app)
      .patch(`/api/join-requests/${reqOnZeroSeats._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(/seats/i);
    expect(zeroSeatOffer.availableSeats).toBe(0);
    expect(reqOnZeroSeats.status).toBe("Pending");
  });

  // ── AUTO-07: Seat decrement ───────────────────────────────────────────────────
  test("AUTO-07: Seat decrement - Acceptance reduces availableSeats exactly once", async () => {
    const pendingRequest = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(pendingRequest);

    const initialSeats = activeOffer.availableSeats; // 3

    const response = await request(app)
      .patch(`/api/join-requests/${pendingRequest._id}/decision`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "Accepted" });

    expect(response.status).toBe(200);
    expect(activeOffer.availableSeats).toBe(initialSeats - 1); // 2
    expect(activeOffer.acceptedPassengers).toBe(1);
  });

  // ── AUTO-08: Requester privacy ────────────────────────────────────────────────
  test("AUTO-08: Requester privacy - Requester receives only own status records", async () => {
    const myReq = makeJoinRequest(activeOffer._id, requester._id, offerOwner._id, { status: "Accepted", decidedAt: new Date() });
    const otherReq = makeJoinRequest(activeOffer._id, otherRequester._id, offerOwner._id, { status: "Pending" });

    testDb.collection("joinRequests").docs.push(myReq, otherReq);

    const response = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.joinRequests).toHaveLength(1);
    expect(response.body.joinRequests[0].id).toBe(myReq._id.toString());
    expect(response.body.joinRequests[0].requesterUserId).toBe(requester._id.toString());
  });
});
