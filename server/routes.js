import { ObjectId } from "mongodb";
import { connectToDatabase } from "./db.js";
import { createToken, hashPassword, requireAuth, verifyPassword } from "./auth.js";
import { toProfile, toPublicUser, toRideOffer, toPublicRideOffer, toJoinRequest } from "./serializers.js";
import { validateEmail, validatePassword, validateProfileUpdate, validateRegistration, validateRideOffer, validateJoinRequest, validateDecision, buildSearchQuery } from "./validators.js";

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

async function getAcceptedPassengers(db, rideOfferId) {
  const normalizedId = typeof rideOfferId === "string" ? new ObjectId(rideOfferId) : rideOfferId;
  const requests = await db.collection("joinRequests").find({
    rideOfferId: normalizedId,
    status: "Accepted"
  }).toArray();
  const passengerIds = requests.map((request) => request.requesterUserId || request.passengerId).filter(Boolean);
  if (!passengerIds.length) return [];

  const [users, profiles] = await Promise.all([
    db.collection("users").find({ _id: { $in: passengerIds } }).toArray(),
    db.collection("profiles").find({ userId: { $in: passengerIds } }).toArray()
  ]);
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
  const requestsByPassengerId = new Map(requests.map((r) => [(r.requesterUserId || r.passengerId).toString(), r]));

  return passengerIds.map((passengerId) => {
    const id = passengerId.toString();
    const user = usersById.get(id);
    const profile = profilesByUserId.get(id);
    const req = requestsByPassengerId.get(id);
    return {
      id,
      requestId: req?._id ? req._id.toString() : null,
      name: user?.name || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Passenger",
      email: user?.email || "",
      phoneNumber: profile?.phoneNumber || "",
      studentStaffId: profile?.studentStaffId || "",
      status: "Accepted",
      decidedAt: req?.decidedAt || null
    };
  });
}

export function registerRoutes(app) {
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/register", asyncRoute(async (req, res) => {
    const errors = validateRegistration(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid registration details.", errors });

    const db = await connectToDatabase();
    const email = req.body.email.trim().toLowerCase();
    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(409).json({ message: "Email address is already registered." });

    const now = new Date();
    const userDoc = {
      name: `${req.body.firstName.trim()} ${req.body.lastName.trim()}`,
      email,
      passwordHash: await hashPassword(req.body.password),
      createdAt: now
    };
    const result = await db.collection("users").insertOne(userDoc);
    const user = { ...userDoc, _id: result.insertedId };

    const profileDoc = {
      userId: result.insertedId,
      firstName: req.body.firstName.trim(),
      lastName: req.body.lastName.trim(),
      phoneNumber: req.body.phoneNumber.trim(),
      studentStaffId: req.body.studentStaffId?.trim() || "ICBT2024XXXX",
      homeRoute: req.body.homeRoute?.trim() || "",
      travelPreferences: [],
      vehicleInformation: null,
      accountType: "ICBT Student",
      updatedAt: now
    };
    const profileResult = await db.collection("profiles").insertOne(profileDoc);

    res.status(201).json({
      token: createToken(user),
      user: toPublicUser(user),
      profile: toProfile({ ...profileDoc, _id: profileResult.insertedId })
    });
  }));

  app.post("/api/auth/login", asyncRoute(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    if (!validateEmail(email) || !validatePassword(req.body.password)) {
      return res.status(400).json({ message: "Enter a valid email and password." });
    }

    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ email });
    if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const profile = await db.collection("profiles").findOne({ userId: user._id });
    res.json({ token: createToken(user), user: toPublicUser(user), profile: toProfile(profile) });
  }));

  app.get("/api/me", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const profile = await db.collection("profiles").findOne({ userId: req.user._id });
    res.json({ user: toPublicUser(req.user), profile: toProfile(profile) });
  }));

  app.put("/api/profile", requireAuth, asyncRoute(async (req, res) => {
    const errors = validateProfileUpdate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid profile details.", errors });

    const db = await connectToDatabase();
    await db.collection("profiles").updateOne(
      { userId: req.user._id },
      {
        $set: {
          firstName: req.body.firstName.trim(),
          lastName: req.body.lastName.trim(),
          phoneNumber: req.body.phoneNumber.trim(),
          homeRoute: req.body.homeRoute?.trim() || "",
          updatedAt: new Date()
        }
      }
    );
    await db.collection("users").updateOne(
      { _id: req.user._id },
      { $set: { name: `${req.body.firstName.trim()} ${req.body.lastName.trim()}` } }
    );

    const user = await db.collection("users").findOne({ _id: req.user._id });
    const profile = await db.collection("profiles").findOne({ userId: req.user._id });
    res.json({ user: toPublicUser(user), profile: toProfile(profile) });
  }));

  app.get("/api/dashboard", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const allActiveOffers = await db.collection("rideOffers").find({
      userId: req.user._id,
      status: "Active"
    }).sort({ createdAt: -1 }).toArray();
    const seededActiveOffers = allActiveOffers.filter((offer) => offer.seedKey);
    const activeOffers = seededActiveOffers.length ? seededActiveOffers : allActiveOffers;
    const pendingRequests = await db.collection("joinRequests").countDocuments({
      ownerUserId: req.user._id,
      status: "Pending"
    });
    const activities = await db.collection("activities").find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const availableSeats = activeOffers.reduce((sum, offer) => sum + Number(offer.availableSeats || 0), 0);
    res.json({
      stats: {
        activeRides: activeOffers.length,
        pendingRequests,
        availableSeats,
        upcomingJourneys: activeOffers.length + pendingRequests
      },
      currentRide: activeOffers[0] ? toRideOffer(activeOffers[0]) : null,
      activities: (activities || []).map((activity) => ({
        id: activity._id ? activity._id.toString() : "",
        title: activity.title || "",
        route: activity.route || "",
        status: activity.status || "",
        createdLabel: activity.createdLabel || ""
      }))
    });
  }));

  app.get("/api/ride-offers/active", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const offers = await db.collection("rideOffers").find({
      userId: req.user._id,
      status: "Active"
    }).sort({ createdAt: -1 }).toArray();
    res.json({ offers: offers.map(toRideOffer) });
  }));

  app.get("/api/ride-offers/draft", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const draft = await db.collection("rideOfferDrafts").findOne({ userId: req.user._id });
    if (!draft) return res.json({ draft: null });

    res.json({
      draft: {
        origin: draft.origin,
        destination: draft.destination,
        departureDate: draft.departureDate,
        departureTime: draft.departureTime,
        timeWindow: draft.timeWindow,
        availableSeats: draft.availableSeats
      }
    });
  }));

  // ── Sprint 2: S2-T05 ──────────────────────────────────────────────────────────
  // Search active ride offers — registered BEFORE /:id so Express doesn't match "search" as an ID
  app.get("/api/ride-offers/search", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const searchFilter = buildSearchQuery(req.query);
    const filter = {
      ...searchFilter,
      status: "Active",
      availableSeats: { $gt: 0 }
    };
    const allOffers = await db.collection("rideOffers").find(filter).sort({ createdAt: -1 }).toArray();
    const offers = allOffers.filter((o) => (o.userId || o.driverId)?.toString() !== req.user._id.toString());
    if (!offers.length) {
      return res.json({ offers: [], message: "No matching rides found for your search criteria." });
    }
    const userIds = [...new Set(offers.map((o) => o.userId || o.driverId).filter(Boolean))];
    const profiles = await db.collection("profiles").find({ userId: { $in: userIds } }).toArray();
    const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));
    const serialized = offers.map((offer) => {
      const ownerId = (offer.userId || offer.driverId || "").toString();
      const ownerProfile = profileByUserId.get(ownerId);
      return toPublicRideOffer(offer, ownerProfile);
    });
    res.json({ offers: serialized });
  }));

  // ── Sprint 2: S2-T06 ──────────────────────────────────────────────────────────
  // Public offer detail — registered BEFORE /:id
  app.get("/api/ride-offers/public/:id", requireAuth, asyncRoute(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ride offer id." });
    const db = await connectToDatabase();
    const offer = await db.collection("rideOffers").findOne({ _id: new ObjectId(req.params.id) });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });
    const ownerId = offer.userId || offer.driverId;
    const ownerProfile = ownerId ? await db.collection("profiles").findOne({ userId: ownerId }) : null;
    res.json({ offer: toPublicRideOffer(offer, ownerProfile) });
  }));

  // ── Sprint 3: US-09 / S3-T02 ──────────────────────────────────────────────
  // Fetch accepted passengers for an owned ride offer
  app.get("/api/ride-offers/:id/accepted-passengers", requireAuth, asyncRoute(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ride offer id." });

    const db = await connectToDatabase();
    const offer = await db.collection("rideOffers").findOne({ _id: new ObjectId(req.params.id) });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const ownerId = (offer.userId || offer.driverId || offer.ownerUserId || "").toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only view accepted passengers for your own ride offers." });
    }

    const passengers = await getAcceptedPassengers(db, offer._id);
    res.json({ passengers, acceptedPassengers: passengers });
  }));

  app.get("/api/ride-offers/:id", requireAuth, asyncRoute(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid ride offer id." });

    const db = await connectToDatabase();
    const offer = await db.collection("rideOffers").findOne({
      _id: new ObjectId(req.params.id),
      $or: [{ userId: req.user._id }, { driverId: req.user._id }, { ownerUserId: req.user._id }]
    });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const passengers = await getAcceptedPassengers(db, offer._id);
    res.json({ offer: toRideOffer(offer, passengers) });
  }));

  app.post("/api/ride-offers", requireAuth, asyncRoute(async (req, res) => {
    const errors = validateRideOffer(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: "Invalid ride offer details.", errors });

    const db = await connectToDatabase();
    const offer = {
      userId: req.user._id,
      origin: req.body.origin.trim(),
      destination: req.body.destination.trim(),
      departureDate: req.body.departureDate.trim(),
      departureTime: req.body.departureTime.trim(),
      timeWindow: req.body.timeWindow.trim(),
      availableSeats: Number(req.body.availableSeats),
      acceptedPassengers: 0,
      status: "Active",
      createdAt: new Date()
    };
    const result = await db.collection("rideOffers").insertOne(offer);
    res.status(201).json({ offer: toRideOffer({ ...offer, _id: result.insertedId }) });
  }));

  app.get("/api/users/:id/profile", requireAuth, asyncRoute(async (req, res) => {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only view your own profile." });
    }
    const db = await connectToDatabase();
    const profile = await db.collection("profiles").findOne({ userId: new ObjectId(req.params.id) });
    res.json({ profile: toProfile(profile) });
  }));

  // ── Sprint 2: S2-T07 ─────────────────────────────────────────────────────────
  // Create a join request for a ride offer.
  app.post("/api/join-requests", requireAuth, asyncRoute(async (req, res) => {
    const validationErrors = validateJoinRequest(req.body);
    if (Object.keys(validationErrors).length) {
      return res.status(400).json({ message: "Invalid request details.", errors: validationErrors });
    }
    if (!ObjectId.isValid(req.body.rideOfferId)) {
      return res.status(400).json({ message: "Invalid ride offer ID." });
    }

    const db = await connectToDatabase();
    const rideOfferId = new ObjectId(req.body.rideOfferId);
    const offer = await db.collection("rideOffers").findOne({ _id: rideOfferId });

    if (!offer) return res.status(404).json({ message: "Ride offer not found." });
    if (offer.status !== "Active" || offer.availableSeats <= 0) {
      return res.status(422).json({ message: "This ride offer is not available for requests." });
    }
    const ownerIdStr = (offer.userId || offer.driverId || "").toString();
    if (ownerIdStr === req.user._id.toString()) {
      return res.status(422).json({ message: "You cannot request to join your own ride offer." });
    }

    const duplicate = await db.collection("joinRequests").findOne({
      rideOfferId,
      requesterUserId: req.user._id,
      status: "Pending"
    });
    if (duplicate) {
      return res.status(409).json({ message: "You already have a pending request for this ride offer." });
    }

    const now = new Date();
    const joinRequestDoc = {
      rideOfferId,
      requesterUserId: req.user._id,
      ownerUserId: offer.userId || offer.driverId,
      status: "Pending",
      requestNote: req.body.requestNote?.trim() || "",
      requestedAt: now,
      updatedAt: now
    };
    const result = await db.collection("joinRequests").insertOne(joinRequestDoc);
    res.status(201).json({
      joinRequest: toJoinRequest({ ...joinRequestDoc, _id: result.insertedId }, offer)
    });
  }));

  // ── Sprint 2: S2-T08 ─────────────────────────────────────────────────────────
  // View own join requests — filters strictly to requesterUserId === authenticated user.
  // Cross-user records cannot be accessed (UT-S2-10).
  app.get("/api/join-requests/mine", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const requests = await db.collection("joinRequests")
      .find({ requesterUserId: req.user._id })
      .sort({ requestedAt: -1 })
      .toArray();

    if (!requests.length) return res.json({ joinRequests: [] });

    // Embed offer summary and owner info for each request
    const offerIds = [...new Set(requests.map((r) => r.rideOfferId).filter(Boolean))];
    const ownerIds = [...new Set(requests.map((r) => r.ownerUserId).filter(Boolean))];
    const [offers, ownerProfiles] = await Promise.all([
      db.collection("rideOffers").find({ _id: { $in: offerIds } }).toArray(),
      db.collection("profiles").find({ userId: { $in: ownerIds } }).toArray()
    ]);
    const offersById = new Map(offers.map((o) => [o._id.toString(), o]));
    const ownerProfilesById = new Map(ownerProfiles.map((p) => [p.userId.toString(), p]));

    const serialized = requests.map((r) => {
      const offer = offersById.get((r.rideOfferId || "").toString());
      const ownerProfile = ownerProfilesById.get((r.ownerUserId || "").toString());
      return toJoinRequest(r, offer, ownerProfile);
    });
    res.json({ joinRequests: serialized });
  }));

  // ── Sprint 3: US-10 / S3-T01 ──────────────────────────────────────────────
  // View received join requests — filters strictly to ownerUserId === authenticated user.
  // Cross-user records cannot be accessed (UT-S3-01, UT-S3-02).
  app.get("/api/join-requests/received", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const requests = await db.collection("joinRequests")
      .find({ ownerUserId: req.user._id })
      .sort({ requestedAt: -1 })
      .toArray();

    if (!requests.length) return res.json({ joinRequests: [] });

    const offerIds = [...new Set(requests.map((r) => r.rideOfferId).filter(Boolean))];
    const requesterIds = [...new Set(requests.map((r) => r.requesterUserId).filter(Boolean))];

    const [offers, users, profiles] = await Promise.all([
      db.collection("rideOffers").find({ _id: { $in: offerIds } }).toArray(),
      db.collection("users").find({ _id: { $in: requesterIds } }).toArray(),
      db.collection("profiles").find({ userId: { $in: requesterIds } }).toArray()
    ]);

    const offersById = new Map(offers.map((o) => [o._id.toString(), o]));
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));
    const profilesByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const serialized = requests.map((r) => {
      const offer = offersById.get((r.rideOfferId || "").toString());
      const requesterIdStr = (r.requesterUserId || "").toString();
      const user = usersById.get(requesterIdStr);
      const profile = profilesByUserId.get(requesterIdStr);
      const requesterSummary = {
        name: user?.name || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Passenger",
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        phoneNumber: profile?.phoneNumber || "",
        email: user?.email || profile?.email || "",
        studentStaffId: profile?.studentStaffId || ""
      };
      return toJoinRequest(r, offer, null, requesterSummary);
    });

    res.json({ joinRequests: serialized });
  }));

  // ── Sprint 3: US-11, US-12 / S3-T03, S3-T04 ───────────────────────────────
  // Decide a join request (Accept, Reject, or Revoke/Cancel).
  const handleDecision = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid join request ID." });
    }

    const validationErrors = validateDecision(req.body);
    if (Object.keys(validationErrors).length) {
      return res.status(400).json({ message: "Invalid decision payload.", errors: validationErrors });
    }

    const db = await connectToDatabase();
    const joinReq = await db.collection("joinRequests").findOne({ _id: new ObjectId(req.params.id) });
    if (!joinReq) {
      return res.status(404).json({ message: "Join request not found." });
    }

    const ownerIdStr = (joinReq.ownerUserId || "").toString();
    if (ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only manage requests for your own ride offers." });
    }

    const rawStatus = (req.body.status || req.body.decision || req.body.action || "").trim();
    const normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    const decisionNote = (req.body.decisionNote || req.body.note || "").trim();
    const now = new Date();

    const offer = await db.collection("rideOffers").findOne({ _id: joinReq.rideOfferId });
    if (!offer) {
      return res.status(404).json({ message: "Ride offer not found." });
    }

    // If request was already decided to the same status or is final
    if (joinReq.status === normalizedStatus) {
      return res.status(422).json({ message: "This request has already been decided." });
    }

    // The decision endpoint only processes Pending requests.
    // Accepted, Rejected, and Cancelled are all terminal for this endpoint.
    // Use the /cancel endpoint to revoke an accepted request.
    if (joinReq.status !== "Pending") {
      return res.status(422).json({ message: "This request has already been decided." });
    }

    // If transitioning from Pending to Accepted
    if (normalizedStatus === "Accepted") {
      if (offer.status !== "Active" || offer.availableSeats <= 0) {
        return res.status(422).json({ message: "Cannot accept request. No available seats remaining." });
      }

      // Atomic decrement with seat > 0 check to ensure capacity is strictly maintained without negative seats
      const updateResult = await db.collection("rideOffers").updateOne(
        { _id: offer._id, availableSeats: { $gt: 0 } },
        {
          $inc: { availableSeats: -1, acceptedPassengers: 1 },
          $set: { updatedAt: now }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(422).json({ message: "No available seats remaining." });
      }
    }

    await db.collection("joinRequests").updateOne(
      { _id: joinReq._id },
      {
        $set: {
          status: normalizedStatus,
          decidedAt: now,
          updatedAt: now,
          ...(decisionNote ? { decisionNote } : {})
        }
      }
    );

    const updatedRequest = await db.collection("joinRequests").findOne({ _id: joinReq._id });
    const updatedOffer = await db.collection("rideOffers").findOne({ _id: joinReq.rideOfferId });
    const requesterUser = await db.collection("users").findOne({ _id: joinReq.requesterUserId });
    const requesterProfile = await db.collection("profiles").findOne({ userId: joinReq.requesterUserId });

    const requesterSummary = {
      name: requesterUser?.name || `${requesterProfile?.firstName || ""} ${requesterProfile?.lastName || ""}`.trim() || "Passenger",
      firstName: requesterProfile?.firstName || "",
      lastName: requesterProfile?.lastName || "",
      phoneNumber: requesterProfile?.phoneNumber || "",
      email: requesterUser?.email || requesterProfile?.email || "",
      studentStaffId: requesterProfile?.studentStaffId || ""
    };

    res.json({
      message: `Request ${normalizedStatus.toLowerCase()} successfully.`,
      joinRequest: toJoinRequest(updatedRequest, updatedOffer, null, requesterSummary)
    });
  };

  app.patch("/api/join-requests/:id/decision", requireAuth, asyncRoute(handleDecision));
  app.put("/api/join-requests/:id/decision", requireAuth, asyncRoute(handleDecision));
  app.post("/api/join-requests/:id/decision", requireAuth, asyncRoute(handleDecision));

  // ── Cancel Join Request (Requester or Owner) ──────────────────────────────────
  const handleCancel = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid join request ID." });
    }

    const db = await connectToDatabase();
    const joinReq = await db.collection("joinRequests").findOne({ _id: new ObjectId(req.params.id) });
    if (!joinReq) {
      return res.status(404).json({ message: "Join request not found." });
    }

    const requesterIdStr = (joinReq.requesterUserId || "").toString();
    const ownerIdStr = (joinReq.ownerUserId || "").toString();
    const currentUserIdStr = req.user._id.toString();

    if (requesterIdStr !== currentUserIdStr && ownerIdStr !== currentUserIdStr) {
      return res.status(403).json({ message: "You are not authorized to cancel this request." });
    }

    if (joinReq.status === "Cancelled") {
      return res.status(422).json({ message: "This request has already been cancelled." });
    }

    if (joinReq.status === "Rejected") {
      return res.status(422).json({ message: "Cannot cancel a rejected request." });
    }

    const now = new Date();
    const cancelReason = (req.body.reason || req.body.decisionNote || req.body.note || "").trim();

    // If revoking an accepted request, restore available seat
    if (joinReq.status === "Accepted") {
      await db.collection("rideOffers").updateOne(
        { _id: joinReq.rideOfferId },
        {
          $inc: { availableSeats: 1, acceptedPassengers: -1 },
          $set: { updatedAt: now }
        }
      );
    }

    await db.collection("joinRequests").updateOne(
      { _id: joinReq._id },
      {
        $set: {
          status: "Rejected",
          decidedAt: now,
          updatedAt: now,
          ...(cancelReason ? { decisionNote: cancelReason } : {})
        }
      }
    );

    const updatedRequest = await db.collection("joinRequests").findOne({ _id: joinReq._id });
    const updatedOffer = await db.collection("rideOffers").findOne({ _id: joinReq.rideOfferId });
    const ownerProfile = ownerIdStr ? await db.collection("profiles").findOne({ userId: new ObjectId(ownerIdStr) }) : null;
    const requesterProfile = requesterIdStr ? await db.collection("profiles").findOne({ userId: new ObjectId(requesterIdStr) }) : null;
    const requesterUser = requesterIdStr ? await db.collection("users").findOne({ _id: new ObjectId(requesterIdStr) }) : null;

    const requesterSummary = requesterProfile || requesterUser ? {
      name: requesterUser?.name || `${requesterProfile?.firstName || ""} ${requesterProfile?.lastName || ""}`.trim() || "Passenger",
      firstName: requesterProfile?.firstName || "",
      lastName: requesterProfile?.lastName || "",
      phoneNumber: requesterProfile?.phoneNumber || "",
      email: requesterUser?.email || requesterProfile?.email || "",
      studentStaffId: requesterProfile?.studentStaffId || ""
    } : null;

    res.json({
      message: "Request cancelled successfully.",
      joinRequest: toJoinRequest(updatedRequest, updatedOffer, ownerProfile, requesterSummary)
    });
  };

  app.post("/api/join-requests/:id/cancel", requireAuth, asyncRoute(handleCancel));
  app.patch("/api/join-requests/:id/cancel", requireAuth, asyncRoute(handleCancel));

  // Fetch single join request detail by ID (must belong to requester or owner)
  app.get("/api/join-requests/:id", requireAuth, asyncRoute(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid join request ID." });
    }
    const db = await connectToDatabase();
    const joinReq = await db.collection("joinRequests").findOne({ _id: new ObjectId(req.params.id) });
    if (!joinReq) return res.status(404).json({ message: "Join request not found." });

    const requesterIdStr = (joinReq.requesterUserId || "").toString();
    const ownerIdStr = (joinReq.ownerUserId || "").toString();
    if (requesterIdStr !== req.user._id.toString() && ownerIdStr !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only view your own join requests." });
    }

    const offer = await db.collection("rideOffers").findOne({ _id: joinReq.rideOfferId });
    const ownerProfile = ownerIdStr ? await db.collection("profiles").findOne({ userId: new ObjectId(ownerIdStr) }) : null;
    const requesterProfile = requesterIdStr ? await db.collection("profiles").findOne({ userId: new ObjectId(requesterIdStr) }) : null;
    const requesterUser = requesterIdStr ? await db.collection("users").findOne({ _id: new ObjectId(requesterIdStr) }) : null;

    const requesterSummary = requesterProfile || requesterUser ? {
      name: requesterUser?.name || `${requesterProfile?.firstName || ""} ${requesterProfile?.lastName || ""}`.trim() || "Passenger",
      firstName: requesterProfile?.firstName || "",
      lastName: requesterProfile?.lastName || "",
      phoneNumber: requesterProfile?.phoneNumber || "",
      email: requesterUser?.email || requesterProfile?.email || "",
      studentStaffId: requesterProfile?.studentStaffId || ""
    } : null;

    res.json({ joinRequest: toJoinRequest(joinReq, offer, ownerProfile, requesterSummary) });
  }));
}
