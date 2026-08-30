import { jest } from "@jest/globals";
import { ObjectId } from "mongodb";
import request from "supertest";

let testDb;

jest.unstable_mockModule("../db.js", () => ({
  connectToDatabase: jest.fn(async () => testDb),
  closeDatabase: jest.fn()
}));

const { createApp } = await import("../app.js");
const { createToken, hashPassword } = await import("../auth.js");
const { buildSearchQuery, validateJoinRequest } = await import("../validators.js");

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

function matchesOperator(actual, expected) {
  if ("$in" in expected) return expected.$in.some((value) => valuesEqual(actual, value));
  if ("$gt" in expected) return actual > expected.$gt;
  if ("$regex" in expected) {
    const regex = new RegExp(expected.$regex, expected.$options || "");
    return regex.test(String(actual || ""));
  }
  return valuesEqual(actual, expected);
}

function matchesFilter(doc, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((option) => matchesFilter(doc, option));
    const actual = getValue(doc, key);
    if (expected && typeof expected === "object" && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
      return matchesOperator(actual, expected);
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

function rideOffer(userId, overrides = {}) {
  return {
    _id: new ObjectId(),
    userId,
    origin: "Maharagama",
    destination: "ICBT Campus",
    departureDate: "Monday, Sep 7",
    departureTime: "7:30 AM",
    timeWindow: "7:00 AM - 8:00 AM",
    availableSeats: 2,
    acceptedPassengers: 0,
    status: "Active",
    createdAt: new Date("2026-08-25T08:00:00.000Z"),
    ...overrides
  };
}

function joinPayload(rideOfferId, overrides = {}) {
  return {
    rideOfferId: rideOfferId.toString(),
    requestNote: "I can join from the main road.",
    ...overrides
  };
}

describe("Sprint 2 code-level test cases", () => {
  let requester;
  let owner;
  let otherUser;
  let outsider;
  let requesterToken;
  let ownerToken;
  let outsiderToken;
  let eligibleOffer;
  let fullOffer;
  let cancelledOffer;
  let ownOffer;
  let otherRouteOffer;

  beforeEach(async () => {
    requester = {
      _id: new ObjectId(),
      name: "Nethmi Perera",
      email: "nethmi@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:00:00.000Z")
    };
    owner = {
      _id: new ObjectId(),
      name: "Kasun Fernando",
      email: "kasun@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:05:00.000Z")
    };
    otherUser = {
      _id: new ObjectId(),
      name: "Ravi Jayasuriya",
      email: "ravi@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:10:00.000Z")
    };
    outsider = {
      _id: new ObjectId(),
      name: "Amani Silva",
      email: "amani@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      createdAt: new Date("2026-08-01T08:15:00.000Z")
    };

    eligibleOffer = rideOffer(owner._id, { createdAt: new Date("2026-08-25T09:00:00.000Z") });
    fullOffer = rideOffer(owner._id, { availableSeats: 0, createdAt: new Date("2026-08-25T10:00:00.000Z") });
    cancelledOffer = rideOffer(owner._id, { status: "Cancelled", createdAt: new Date("2026-08-25T11:00:00.000Z") });
    ownOffer = rideOffer(requester._id, { createdAt: new Date("2026-08-25T12:00:00.000Z") });
    otherRouteOffer = rideOffer(otherUser._id, {
      origin: "Nugegoda",
      destination: "ICBT Campus",
      availableSeats: 3,
      createdAt: new Date("2026-08-25T13:00:00.000Z")
    });

    testDb = createFakeDb({
      users: [requester, owner, otherUser, outsider],
      profiles: [
        { _id: new ObjectId(), userId: requester._id, firstName: "Nethmi", lastName: "Perera", phoneNumber: "0771234567", studentStaffId: "ICBT2024XXXX", homeRoute: "Panadura -> ICBT Campus", travelPreferences: [], vehicleInformation: null, accountType: "ICBT Student", updatedAt: new Date() },
        { _id: new ObjectId(), userId: owner._id, firstName: "Kasun", lastName: "Fernando", phoneNumber: "0764567890", studentStaffId: "ICBT2024YYYY", homeRoute: "Maharagama -> ICBT Campus", travelPreferences: [], vehicleInformation: null, accountType: "ICBT Student", updatedAt: new Date() },
        { _id: new ObjectId(), userId: otherUser._id, firstName: "Ravi", lastName: "Jayasuriya", phoneNumber: "0712223333", studentStaffId: "ICBT2024ZZZZ", homeRoute: "Nugegoda -> ICBT Campus", travelPreferences: [], vehicleInformation: null, accountType: "ICBT Student", updatedAt: new Date() },
        { _id: new ObjectId(), userId: outsider._id, firstName: "Amani", lastName: "Silva", phoneNumber: "0752223333", studentStaffId: "ICBT2024WWWW", homeRoute: "Kottawa -> ICBT Campus", travelPreferences: [], vehicleInformation: null, accountType: "ICBT Student", updatedAt: new Date() }
      ],
      rideOffers: [eligibleOffer, fullOffer, cancelledOffer, ownOffer, otherRouteOffer],
      rideOfferDrafts: [],
      joinRequests: [],
      activities: []
    });

    requesterToken = createToken(requester);
    ownerToken = createToken(owner);
    outsiderToken = createToken(outsider);
  });

  test("S2-TDD-01 returns only eligible matching offers", async () => {
    const response = await request(app)
      .get("/api/ride-offers/search")
      .query({ origin: "  maharaGAMA ", destination: "icbt campus" })
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(response.status).toBe(200);
    expect(response.body.offers).toHaveLength(1);
    expect(response.body.offers[0].id).toBe(eligibleOffer._id.toString());
    expect(response.body.offers[0].availableSeats).toBeGreaterThan(0);
    expect(response.body.offers[0].status).toBe("Active");
    expect(response.body.offers[0].userId).toBeUndefined();
  });

  test("S2-TDD-02 creates a valid pending join request", async () => {
    const response = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(joinPayload(eligibleOffer._id));

    expect(response.status).toBe(201);
    expect(response.body.joinRequest.rideOfferId).toBe(eligibleOffer._id.toString());
    expect(response.body.joinRequest.ownerUserId).toBe(owner._id.toString());
    expect(response.body.joinRequest.status).toBe("Pending");
    expect(await testDb.collection("joinRequests").countDocuments({ requesterUserId: requester._id })).toBe(1);
  });

  test("S2-UT-01 validates search normalization and eligibility filtering", async () => {
    const filter = buildSearchQuery({ origin: "  MAHARAGAMA ", destination: " icbt campus " });
    const response = await request(app)
      .get("/api/ride-offers/search")
      .query({ origin: "maharagama", destination: "ICBT" })
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(filter.origin).toEqual({ $regex: "MAHARAGAMA", $options: "i" });
    expect(filter.destination).toEqual({ $regex: "icbt campus", $options: "i" });
    expect(response.status).toBe(200);
    expect(response.body.offers.map((offer) => offer.id)).toEqual([eligibleOffer._id.toString()]);
  });

  test("S2-UT-02 validates join-request eligibility rules", async () => {
    const missingBodyErrors = validateJoinRequest({ rideOfferId: "" });
    const firstRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(eligibleOffer._id));
    const duplicateRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(eligibleOffer._id));
    const ownRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(ownOffer._id));
    const fullRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(fullOffer._id));
    const cancelledRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(cancelledOffer._id));
    const missingOfferRequest = await request(app).post("/api/join-requests").set("Authorization", `Bearer ${requesterToken}`).send(joinPayload(new ObjectId()));

    expect(missingBodyErrors.rideOfferId).toBe("Ride offer ID is required.");
    expect(firstRequest.status).toBe(201);
    expect(duplicateRequest.status).toBe(409);
    expect(ownRequest.status).toBe(422);
    expect(fullRequest.status).toBe(422);
    expect(cancelledRequest.status).toBe(422);
    expect(missingOfferRequest.status).toBe(404);
    expect(await testDb.collection("joinRequests").countDocuments({ requesterUserId: requester._id })).toBe(1);
  });

  test("S2-UT-03 filters own join requests by authenticated requester", async () => {
    const requesterJoinRequest = { _id: new ObjectId(), rideOfferId: eligibleOffer._id, requesterUserId: requester._id, ownerUserId: owner._id, status: "Pending", requestNote: "Mine", requestedAt: new Date("2026-08-25T14:00:00.000Z"), updatedAt: new Date("2026-08-25T14:00:00.000Z") };
    const otherJoinRequest = { _id: new ObjectId(), rideOfferId: otherRouteOffer._id, requesterUserId: otherUser._id, ownerUserId: owner._id, status: "Pending", requestNote: "Other", requestedAt: new Date("2026-08-25T15:00:00.000Z"), updatedAt: new Date("2026-08-25T15:00:00.000Z") };
    await testDb.collection("joinRequests").insertOne(requesterJoinRequest);
    await testDb.collection("joinRequests").insertOne(otherJoinRequest);

    const mineResponse = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);
    const crossUserDetailResponse = await request(app)
      .get(`/api/join-requests/${otherJoinRequest._id}`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(mineResponse.status).toBe(200);
    expect(mineResponse.body.joinRequests).toHaveLength(1);
    expect(mineResponse.body.joinRequests[0].id).toBe(requesterJoinRequest._id.toString());
    expect(crossUserDetailResponse.status).toBe(403);
    expect(crossUserDetailResponse.body.message).toBe("You can only view your own join requests.");
  });

  test("S2-AT-01 searches matching, no-result and unavailable offers", async () => {
    const matchingResponse = await request(app)
      .get("/api/ride-offers/search")
      .query({ origin: "Maharagama", destination: "ICBT Campus" })
      .set("Authorization", `Bearer ${requesterToken}`);
    const noResultResponse = await request(app)
      .get("/api/ride-offers/search")
      .query({ origin: "Galle", destination: "ICBT Campus" })
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(matchingResponse.status).toBe(200);
    expect(matchingResponse.body.offers.map((offer) => offer.id)).toEqual([eligibleOffer._id.toString()]);
    expect(noResultResponse.status).toBe(200);
    expect(noResultResponse.body.offers).toEqual([]);
    expect(noResultResponse.body.message).toBe("No matching rides found for your search criteria.");
  });

  test("S2-AT-02 creates and persists a join request through the API", async () => {
    const createResponse = await request(app)
      .post("/api/join-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(joinPayload(eligibleOffer._id, { requestNote: "Please reserve one seat." }));
    const mineResponse = await request(app)
      .get("/api/join-requests/mine")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.joinRequest.status).toBe("Pending");
    expect(mineResponse.status).toBe(200);
    expect(mineResponse.body.joinRequests).toHaveLength(1);
    expect(mineResponse.body.joinRequests[0].id).toBe(createResponse.body.joinRequest.id);
    expect(mineResponse.body.joinRequests[0].offer.origin).toBe(eligibleOffer.origin);
  });

  test("S2-AT-03 protects requester authentication and join-request privacy", async () => {
    const joinRequest = { _id: new ObjectId(), rideOfferId: eligibleOffer._id, requesterUserId: requester._id, ownerUserId: owner._id, status: "Pending", requestNote: "Private", requestedAt: new Date(), updatedAt: new Date() };
    await testDb.collection("joinRequests").insertOne(joinRequest);

    const unauthenticatedCreateResponse = await request(app).post("/api/join-requests").send(joinPayload(eligibleOffer._id));
    const unauthenticatedMineResponse = await request(app).get("/api/join-requests/mine");
    const ownerDetailResponse = await request(app).get(`/api/join-requests/${joinRequest._id}`).set("Authorization", `Bearer ${ownerToken}`);
    const outsiderDetailResponse = await request(app).get(`/api/join-requests/${joinRequest._id}`).set("Authorization", `Bearer ${outsiderToken}`);

    expect(unauthenticatedCreateResponse.status).toBe(401);
    expect(unauthenticatedMineResponse.status).toBe(401);
    expect(ownerDetailResponse.status).toBe(200);
    expect(ownerDetailResponse.body.joinRequest.id).toBe(joinRequest._id.toString());
    expect(outsiderDetailResponse.status).toBe(403);
    expect(outsiderDetailResponse.body.message).toBe("You can only view your own join requests.");
  });
});