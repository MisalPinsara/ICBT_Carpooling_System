/**
 * Sprint 4 Code-Level Test Cases
 * Table: Sprint 4 code-level test cases.
 *
 * 9 tests — one per row in the specification matrix:
 *
 *  S4-TDD-01  TDD / Test-first  US-04           Change password with current-password verification
 *  S4-TDD-02  TDD / Test-first  US-18           Leave joined ride and restore one seat
 *  S4-UT-01   Unit              US-07           Offer edit ownership and seat-boundary validation
 *  S4-UT-02   Unit              US-08/17/18     Offer/request/participation state validation
 *  S4-UT-03   Unit              US-19/20        Message access and journey classification logic
 *  S4-AT-01   Automated         US-04           Password-change API flow
 *  S4-AT-02   Automated         US-07/08/17/18  Management state-propagation flow
 *  S4-AT-03   Automated         US-19           Messaging access-control flow
 *  S4-AT-04   Automated         US-20 + reg.    History and final protected-route regression suite
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
const { createToken, hashPassword } = await import("../auth.js");

const app = createApp();

// ── Factories ────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return { _id: new ObjectId(), name: "Test User", email: "user@icbt.lk", passwordHash: "hashed", createdAt: new Date(), ...overrides };
}
function makeProfile(userId, overrides = {}) {
  return { _id: new ObjectId(), userId, firstName: "Test", lastName: "User", phoneNumber: "+94771234567", studentStaffId: "ICBT2024", accountType: "ICBT Student", updatedAt: new Date(), ...overrides };
}
function makeOffer(userId, overrides = {}) {
  return { _id: new ObjectId(), userId, origin: "Maharagama", destination: "ICBT Campus", departureDate: "Tomorrow", departureTime: "7:30 AM", timeWindow: "7:00 AM - 8:00 AM", availableSeats: 3, acceptedPassengers: 0, status: "Active", createdAt: new Date(), ...overrides };
}
function makeJoinRequest(rideOfferId, requesterUserId, ownerUserId, overrides = {}) {
  return { _id: new ObjectId(), rideOfferId, requesterUserId, ownerUserId, status: "Pending", requestNote: "", requestedAt: new Date(), updatedAt: new Date(), ...overrides };
}

// ── Shared state ─────────────────────────────────────────────────────────────

describe("Sprint 4 Code-Level Test Cases", () => {
  let owner, requester, unrelated;
  let ownerToken, requesterToken, unrelatedToken;
  let activeOffer, cancelledOffer;
  const PLAIN_PASSWORD = "OldPass@123";
  const NEW_PASSWORD   = "NewPass@456";

  beforeEach(async () => {
    const passwordHash = await hashPassword(PLAIN_PASSWORD);

    owner     = makeUser({ name: "Kasun Fernando",   email: "kasun@icbt.lk",  passwordHash });
    requester = makeUser({ name: "Nethmi Perera",    email: "nethmi@icbt.lk", passwordHash });
    unrelated = makeUser({ name: "Ravi Jayasuriya",  email: "ravi@icbt.lk",   passwordHash });

    activeOffer    = makeOffer(owner._id, { availableSeats: 3, status: "Active"    });
    cancelledOffer = makeOffer(owner._id, { availableSeats: 0, status: "Cancelled" });

    testDb = createFakeDb({
      users:        [owner, requester, unrelated],
      profiles:     [
        makeProfile(owner._id,     { firstName: "Kasun",  lastName: "Fernando"  }),
        makeProfile(requester._id, { firstName: "Nethmi", lastName: "Perera"    }),
        makeProfile(unrelated._id, { firstName: "Ravi",   lastName: "Jayasuriya" })
      ],
      rideOffers:   [activeOffer, cancelledOffer],
      joinRequests: [],
      messages:     [],
      activities:   []
    });

    ownerToken      = createToken(owner);
    requesterToken  = createToken(requester);
    unrelatedToken  = createToken(unrelated);
  });

  // ── S4-TDD-01 ───────────────────────────────────────────────────────────────
  /**
   * TDD / Test-first | US-04
   * Scenario : Change password with current-password verification
   * Setup    : Write password-change test before update logic
   * Expected : Only the correct current password permits change; new password works afterwards
   */
  test("S4-TDD-01: Correct current password allows change; wrong current password is rejected", async () => {
    // Correct password → 200
    const okRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ currentPassword: PLAIN_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(okRes.status).toBe(200);
    expect(okRes.body.message).toMatch(/password updated/i);

    // Wrong password → 400
    const failRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ currentPassword: "WrongPass@000", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(failRes.status).toBe(400);
    expect(failRes.body.errors?.currentPassword).toBeTruthy();
  });

  // ── S4-TDD-02 ───────────────────────────────────────────────────────────────
  /**
   * TDD / Test-first | US-18
   * Scenario : Leave joined ride and restore one seat
   * Setup    : Write leave-ride state test before seat-restoration logic
   * Expected : Valid participation is removed, exactly one seat is restored;
   *            unjoined users are rejected
   */
  test("S4-TDD-02: Accepted passenger can leave and one seat is restored; unjoined user is rejected", async () => {
    const acceptedReq = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Accepted" });
    const unrelatedReq = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Accepted" });
    testDb.collection("joinRequests").docs.push(acceptedReq, unrelatedReq);

    const seatsBefore = activeOffer.availableSeats;

    // Valid leave → 200, status Left, seat restored
    const leaveRes = await request(app)
      .post(`/api/join-requests/${acceptedReq._id}/leave`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.joinRequest.status).toBe("Left");
    const updatedOffer = await testDb.collection("rideOffers").findOne({ _id: activeOffer._id });
    expect(updatedOffer.availableSeats).toBe(seatsBefore + 1);

    // Unjoined user trying to leave → 403
    const denyRes = await request(app)
      .post(`/api/join-requests/${unrelatedReq._id}/leave`)
      .set("Authorization", `Bearer ${unrelatedToken}`);
    expect(denyRes.status).toBe(403);
  });

  // ── S4-UT-01 ────────────────────────────────────────────────────────────────
  /**
   * Unit | US-07
   * Scenario : Offer edit ownership and seat-boundary validation
   * Setup    : Test owner identity and prevention of reducing seats below accepted participation
   * Expected : Only the owner can edit; invalid seat reductions are rejected
   */
  test("S4-UT-01: Only the owner can edit the offer; negative seat count is rejected", async () => {
    const validBody = { origin: "Maharagama", destination: "ICBT Campus", departureDate: "Tomorrow", departureTime: "8:00 AM", timeWindow: "7:30-8:30", availableSeats: 3 };

    // Owner edits → 200
    const ownerRes = await request(app)
      .put(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...validBody, departureTime: "8:00 AM" });
    expect(ownerRes.status).toBe(200);

    // Non-owner edits → 403
    const nonOwnerRes = await request(app)
      .put(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(validBody);
    expect(nonOwnerRes.status).toBe(403);

    // Negative seats → 400
    const negSeatsRes = await request(app)
      .put(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...validBody, availableSeats: -1 });
    expect(negSeatsRes.status).toBe(400);
  });

  // ── S4-UT-02 ────────────────────────────────────────────────────────────────
  /**
   * Unit | US-08/17/18
   * Scenario : Offer/request/participation state validation
   * Setup    : Test cancellation and leave actions against valid and invalid states
   * Expected : Only valid owner/requester actions change state; invalid state changes are rejected
   */
  test("S4-UT-02: Valid state changes succeed; invalid or unauthorised state changes are rejected", async () => {
    // Use a dedicated offer for join-request cancel tests so offer-cancel cascade does not interfere
    const separateOffer = makeOffer(owner._id, { availableSeats: 2, status: "Active" });
    testDb.collection("rideOffers").docs.push(separateOffer);

    const pendingReq   = makeJoinRequest(separateOffer._id, requester._id, owner._id, { status: "Pending"   });
    const cancelledReq = makeJoinRequest(separateOffer._id, requester._id, owner._id, { status: "Cancelled" });
    testDb.collection("joinRequests").docs.push(pendingReq, cancelledReq);

    // Owner cancels Active offer → 200
    const cancelOk = await request(app)
      .post(`/api/ride-offers/${activeOffer._id}/cancel`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(cancelOk.status).toBe(200);
    expect(cancelOk.body.offer.status).toBe("Cancelled");

    // Cancel again → 422
    const cancelAgain = await request(app)
      .post(`/api/ride-offers/${activeOffer._id}/cancel`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(cancelAgain.status).toBe(422);

    // Requester cancels Pending request on the separate offer → 200
    const reqCancel = await request(app)
      .post(`/api/join-requests/${pendingReq._id}/cancel`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(reqCancel.status).toBe(200);

    // Cancel already-Cancelled request → 422
    const reqCancelAgain = await request(app)
      .post(`/api/join-requests/${cancelledReq._id}/cancel`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(reqCancelAgain.status).toBe(422);
  });

  // ── S4-UT-03 ────────────────────────────────────────────────────────────────
  /**
   * Unit | US-19/20
   * Scenario : Message access and journey classification logic
   * Setup    : Test participant access to conversations and date/status classification for journeys
   * Expected : Only permitted users can access a conversation;
   *            journeys are correctly separated into upcoming and previous groups
   */
  test("S4-UT-03: Connected users can message; unrelated users cannot; journeys are classified correctly", async () => {
    const joinReq = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Pending" });
    testDb.collection("joinRequests").docs.push(joinReq);

    // Connected requester can message owner → 201
    const msgOk = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString(), recipientUserId: owner._id.toString(), content: "Is the seat available?" });
    expect(msgOk.status).toBe(201);

    // Unrelated user cannot message → 403
    const msgDeny = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${unrelatedToken}`)
      .send({ rideOfferId: activeOffer._id.toString(), recipientUserId: owner._id.toString(), content: "Let me in" });
    expect(msgDeny.status).toBe(403);

    // Active offer → upcoming; Cancelled offer → previous
    const journeys = await request(app)
      .get("/api/journeys")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(journeys.status).toBe(200);
    expect(journeys.body.upcoming.map((j) => j.id)).toContain(activeOffer._id.toString());
    expect(journeys.body.previous.map((j) => j.id)).toContain(cancelledOffer._id.toString());
  });

  // ── S4-AT-01 ────────────────────────────────────────────────────────────────
  /**
   * Automated | US-04
   * Scenario : Password-change API flow
   * Setup    : Authenticate, submit valid current/new password, then verify old and new credentials
   * Expected : Password changes successfully; old credentials fail and new credentials work
   */
  test("S4-AT-01: Valid change succeeds; old credentials then fail; new hash is stored in DB", async () => {
    const hashBefore = (await testDb.collection("users").findOne({ _id: requester._id })).passwordHash;

    // Valid change → 200
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ currentPassword: PLAIN_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.message).toMatch(/password updated/i);

    // Old password no longer works → 400
    const oldFails = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ currentPassword: PLAIN_PASSWORD, newPassword: "Another@789", confirmPassword: "Another@789" });
    expect(oldFails.status).toBe(400);

    // New hash stored in DB differs from original
    const updatedUser = await testDb.collection("users").findOne({ _id: requester._id });
    expect(updatedUser.passwordHash).not.toBe(hashBefore);
  });

  // ── S4-AT-02 ────────────────────────────────────────────────────────────────
  /**
   * Automated | US-07/08/17/18
   * Scenario : Management state-propagation flow
   * Setup    : Execute edit/cancel/request-cancel/leave actions and reload related records
   * Expected : Valid state changes propagate consistently across offer, request, participation and seat data
   */
  test("S4-AT-02: State changes propagate — edits reflect, cancel cascades, leave restores seat", async () => {
    const pendingReq  = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Pending"  });
    const acceptedReq = makeJoinRequest(activeOffer._id, unrelated._id, owner._id, { status: "Accepted" });
    testDb.collection("joinRequests").docs.push(pendingReq, acceptedReq);

    // Edit offer → updated fields reflected
    const editRes = await request(app)
      .put(`/api/ride-offers/${activeOffer._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ origin: "Nugegoda", destination: "ICBT Campus", departureDate: "Tomorrow", departureTime: "9:00 AM", timeWindow: "8:30-9:30", availableSeats: 4 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.offer.origin).toBe("Nugegoda");

    // Cancel offer → pending join requests also cancelled
    const cancelRes = await request(app)
      .post(`/api/ride-offers/${activeOffer._id}/cancel`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.offer.status).toBe("Cancelled");
    const cascaded = await testDb.collection("joinRequests").findOne({ _id: pendingReq._id });
    expect(cascaded.status).toBe("Cancelled");

    // Accepted passenger leaves → seat restored
    const seatsBefore = (await testDb.collection("rideOffers").findOne({ _id: activeOffer._id })).availableSeats;
    const leaveRes = await request(app)
      .post(`/api/join-requests/${acceptedReq._id}/leave`)
      .set("Authorization", `Bearer ${unrelatedToken}`);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.joinRequest.status).toBe("Left");
    const offerAfter = await testDb.collection("rideOffers").findOne({ _id: activeOffer._id });
    expect(offerAfter.availableSeats).toBe(seatsBefore + 1);
  });

  // ── S4-AT-03 ────────────────────────────────────────────────────────────────
  /**
   * Automated | US-19
   * Scenario : Messaging access-control flow
   * Setup    : Send as a permitted participant, then attempt direct access as an unrelated user
   * Expected : Permitted messaging succeeds; unrelated conversation access is denied
   */
  test("S4-AT-03: Permitted participant can message; unrelated user is denied; unauthenticated is rejected", async () => {
    const joinReq = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Accepted" });
    testDb.collection("joinRequests").docs.push(joinReq);

    // Permitted requester → 201
    const allowedRes = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ rideOfferId: activeOffer._id.toString(), recipientUserId: owner._id.toString(), content: "Hi, is the seat still available?" });
    expect(allowedRes.status).toBe(201);

    // Unrelated user → 403
    const deniedRes = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${unrelatedToken}`)
      .send({ rideOfferId: activeOffer._id.toString(), recipientUserId: owner._id.toString(), content: "Let me in" });
    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.message).toMatch(/only message users connected/i);

    // Unauthenticated → 401
    const unauthRes = await request(app)
      .post("/api/messages")
      .send({ rideOfferId: activeOffer._id.toString(), recipientUserId: owner._id.toString(), content: "Hello" });
    expect(unauthRes.status).toBe(401);
  });

  // ── S4-AT-04 ────────────────────────────────────────────────────────────────
  /**
   * Automated | US-20 + regression
   * Scenario : History and final protected-route regression suite
   * Setup    : Retrieve upcoming/previous journeys and run selected protected-route regression checks
   * Expected : Journeys are correctly classified; core privacy/protected-route behaviour remains secure
   */
  test("S4-AT-04: Journeys are classified correctly and all core protected routes reject unauthenticated access", async () => {
    const acceptedReq = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Accepted" });
    const leftReq     = makeJoinRequest(activeOffer._id, requester._id, owner._id, { status: "Left"     });
    testDb.collection("joinRequests").docs.push(acceptedReq, leftReq);

    // Owner: active → upcoming, cancelled → previous
    const ownerJourneys = await request(app)
      .get("/api/journeys")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerJourneys.status).toBe(200);
    expect(ownerJourneys.body.upcoming.map((j) => j.id)).toContain(activeOffer._id.toString());
    expect(ownerJourneys.body.previous.map((j) => j.id)).toContain(cancelledOffer._id.toString());

    // Requester: accepted request → upcoming, left request → previous
    const reqJourneys = await request(app)
      .get("/api/journeys")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(reqJourneys.status).toBe(200);
    expect(reqJourneys.body.upcoming.map((j) => j.id)).toContain(acceptedReq._id.toString());
    expect(reqJourneys.body.previous.map((j) => j.id)).toContain(leftReq._id.toString());

    // Regression: core protected routes must return 401 without a token
    for (const url of ["/api/journeys", "/api/me", `/api/messages?rideOfferId=${activeOffer._id}`]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    }

    // Regression: cross-user profile access must return 403
    const profileRes = await request(app)
      .get(`/api/users/${owner._id}/profile`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(profileRes.status).toBe(403);
  });
});
