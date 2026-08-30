import { ObjectId } from "mongodb";
import { connectToDatabase } from "./db.js";
import { createToken, hashPassword, requireAuth, verifyPassword } from "./auth.js";
import { toProfile, toPublicUser, toRideOffer, toPublicRideOffer, toJoinRequest, toMessage } from "./serializers.js";
import { validateEmail, validatePassword, validateProfileUpdate, validateRegistration, validateRideOffer, validateJoinRequest, validateDecision, buildSearchQuery, validatePasswordChange, validateRideOfferEdit, validateMessage } from "./validators.js";

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

    const isRequester = requesterIdStr === currentUserIdStr;
    const isOwner = ownerIdStr === currentUserIdStr;

    if (!isRequester && !isOwner) {
      return res.status(403).json({ message: "You are not authorized to cancel this request." });
    }

    if (joinReq.status === "Cancelled" || joinReq.status === "Left") {
      return res.status(422).json({ message: "This request has already been cancelled or left." });
    }

    if (joinReq.status === "Rejected") {
      return res.status(422).json({ message: "Cannot cancel a rejected request." });
    }

    const now = new Date();
    const cancelReason = (req.body.reason || req.body.decisionNote || req.body.note || "").trim();

    // Determine new status: Requester cancelling pending => Cancelled, Requester leaving accepted => Left, Owner revoking => Rejected
    let newStatus = "Cancelled";
    if (isRequester && joinReq.status === "Accepted") {
      newStatus = "Left";
    } else if (isOwner) {
      newStatus = "Rejected";
    }

    // If revoking or leaving an accepted request, restore available seat
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
          status: newStatus,
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
      message: newStatus === "Left" ? "You have left the ride successfully." : "Request cancelled successfully.",
      joinRequest: toJoinRequest(updatedRequest, updatedOffer, ownerProfile, requesterSummary)
    });
  };

  app.post("/api/join-requests/:id/cancel", requireAuth, asyncRoute(handleCancel));
  app.patch("/api/join-requests/:id/cancel", requireAuth, asyncRoute(handleCancel));

  // ── US-18: Leave Joined Ride Endpoint ───────────────────────────────────────
  const handleLeave = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid join request ID." });
    }

    const db = await connectToDatabase();
    const joinReq = await db.collection("joinRequests").findOne({ _id: new ObjectId(req.params.id) });
    if (!joinReq) return res.status(404).json({ message: "Join request not found." });

    const requesterIdStr = (joinReq.requesterUserId || "").toString();
    if (requesterIdStr !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the accepted passenger can leave this ride." });
    }

    if (joinReq.status !== "Accepted") {
      return res.status(422).json({ message: "Only accepted rides can be left." });
    }

    const now = new Date();
    await db.collection("rideOffers").updateOne(
      { _id: joinReq.rideOfferId },
      { $inc: { availableSeats: 1, acceptedPassengers: -1 }, $set: { updatedAt: now } }
    );

    await db.collection("joinRequests").updateOne(
      { _id: joinReq._id },
      { $set: { status: "Left", leftAt: now, updatedAt: now } }
    );

    const updatedRequest = await db.collection("joinRequests").findOne({ _id: joinReq._id });
    const updatedOffer = await db.collection("rideOffers").findOne({ _id: joinReq.rideOfferId });
    res.json({ message: "You have left the ride successfully.", joinRequest: toJoinRequest(updatedRequest, updatedOffer) });
  };

  app.post("/api/join-requests/:id/leave", requireAuth, asyncRoute(handleLeave));
  app.patch("/api/join-requests/:id/leave", requireAuth, asyncRoute(handleLeave));

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

  // ── US-04: Change & Reset Password Endpoints ──────────────────────────────
  const handlePasswordChange = async (req, res) => {
    const currentPassword = (req.body.currentPassword || req.body.oldPassword || req.body.current_password || "").trim();
    const newPassword = (req.body.newPassword || req.body.new_password || req.body.password || "").trim();
    const confirmPassword = (req.body.confirmPassword || req.body.confirmNewPassword || req.body.newPasswordConfirm || req.body.confirm_password || req.body.passwordConfirmation || "").trim();

    const errors = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: "Invalid password change details.", errors });
    }

    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: req.user._id });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Current password is incorrect.", errors: { currentPassword: "Current password is incorrect." } });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await db.collection("users").updateOne(
      { _id: req.user._id },
      { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
    );

    res.json({ message: "Password updated successfully." });
  };

  app.post("/api/auth/change-password", requireAuth, asyncRoute(handlePasswordChange));
  app.put("/api/auth/change-password", requireAuth, asyncRoute(handlePasswordChange));
  app.patch("/api/auth/change-password", requireAuth, asyncRoute(handlePasswordChange));
  app.post("/api/auth/password", requireAuth, asyncRoute(handlePasswordChange));
  app.put("/api/auth/password", requireAuth, asyncRoute(handlePasswordChange));
  app.patch("/api/auth/password", requireAuth, asyncRoute(handlePasswordChange));
  app.post("/api/profile/password", requireAuth, asyncRoute(handlePasswordChange));
  app.put("/api/profile/password", requireAuth, asyncRoute(handlePasswordChange));
  app.patch("/api/profile/password", requireAuth, asyncRoute(handlePasswordChange));

  // Reset password endpoint for unauthenticated users
  app.post("/api/auth/reset-password", asyncRoute(async (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const newPassword = (req.body.newPassword || req.body.password || "").trim();

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "A valid ICBT email address is required." });
    }

    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.json({ message: "Password reset request processed." });
    }

    if (newPassword) {
      if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: "New password must be at least 8 characters." });
      }
      const newHash = await hashPassword(newPassword);
      await db.collection("users").updateOne({ _id: user._id }, { $set: { passwordHash: newHash, updatedAt: new Date() } });
      return res.json({ message: "Password reset successfully." });
    }

    res.json({ message: "Password reset instructions sent." });
  }));


  // ── US-07: Edit Ride Offer Endpoint ────────────────────────────────────────
  app.put("/api/ride-offers/:id", requireAuth, asyncRoute(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ride offer id." });
    }

    const errors = validateRideOfferEdit(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: "Invalid ride offer details.", errors });
    }

    const db = await connectToDatabase();
    const offerId = new ObjectId(req.params.id);
    const offer = await db.collection("rideOffers").findOne({ _id: offerId });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const ownerId = (offer.userId || offer.driverId || "").toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own ride offers." });
    }

    if (offer.status === "Cancelled" || offer.status === "Completed") {
      return res.status(422).json({ message: "Cancelled or completed ride offers cannot be edited." });
    }

    const newSeats = Number(req.body.availableSeats);
    if (newSeats < 0) {
      return res.status(400).json({ message: "Available seats cannot be negative." });
    }

    const now = new Date();
    await db.collection("rideOffers").updateOne(
      { _id: offerId },
      {
        $set: {
          origin: req.body.origin.trim(),
          destination: req.body.destination.trim(),
          departureDate: req.body.departureDate.trim(),
          departureTime: req.body.departureTime.trim(),
          timeWindow: req.body.timeWindow.trim(),
          availableSeats: newSeats,
          updatedAt: now
        }
      }
    );

    const updatedOffer = await db.collection("rideOffers").findOne({ _id: offerId });
    const passengers = await getAcceptedPassengers(db, offerId);
    res.json({ message: "Ride offer updated successfully.", offer: toRideOffer(updatedOffer, passengers) });
  }));

  // ── US-08: Cancel Ride Offer Endpoint ──────────────────────────────────────
  const handleOfferCancel = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ride offer id." });
    }

    const db = await connectToDatabase();
    const offerId = new ObjectId(req.params.id);
    const offer = await db.collection("rideOffers").findOne({ _id: offerId });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const ownerId = (offer.userId || offer.driverId || "").toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own ride offers." });
    }

    if (offer.status === "Cancelled") {
      return res.status(422).json({ message: "Ride offer is already cancelled." });
    }

    const now = new Date();
    await db.collection("rideOffers").updateOne(
      { _id: offerId },
      { $set: { status: "Cancelled", cancelledAt: now, updatedAt: now } }
    );

    // Cancel all pending join requests for this offer
    await db.collection("joinRequests").updateMany(
      { rideOfferId: offerId, status: "Pending" },
      { $set: { status: "Cancelled", decisionNote: "Ride offer was cancelled by owner", updatedAt: now } }
    );

    const updatedOffer = await db.collection("rideOffers").findOne({ _id: offerId });
    res.json({ message: "Ride offer cancelled successfully.", offer: toRideOffer(updatedOffer) });
  };

  app.post("/api/ride-offers/:id/cancel", requireAuth, asyncRoute(handleOfferCancel));
  app.patch("/api/ride-offers/:id/cancel", requireAuth, asyncRoute(handleOfferCancel));

  // ── US-19: Messaging Endpoints ─────────────────────────────────────────────
  // Send message
  app.post("/api/messages", requireAuth, asyncRoute(async (req, res) => {
    const errors = validateMessage(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: "Invalid message details.", errors });
    }

    if (!ObjectId.isValid(req.body.rideOfferId) || !ObjectId.isValid(req.body.recipientUserId)) {
      return res.status(400).json({ message: "Invalid ride offer or recipient ID." });
    }

    const db = await connectToDatabase();
    const rideOfferId = new ObjectId(req.body.rideOfferId);
    const recipientUserId = new ObjectId(req.body.recipientUserId);
    const senderUserId = req.user._id;

    if (senderUserId.toString() === recipientUserId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }

    const offer = await db.collection("rideOffers").findOne({ _id: rideOfferId });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const ownerIdStr = (offer.userId || offer.driverId || "").toString();
    const isSenderOwner = ownerIdStr === senderUserId.toString();
    const isRecipientOwner = ownerIdStr === recipientUserId.toString();

    // Check connection between sender and recipient (any join-request status is sufficient)
    let isConnected = false;
    if (isSenderOwner) {
      const reqDoc = await db.collection("joinRequests").findOne({
        rideOfferId,
        requesterUserId: recipientUserId,
        status: { $in: ["Pending", "Accepted", "Rejected", "Cancelled", "Left"] }
      });
      if (reqDoc) isConnected = true;
    } else if (isRecipientOwner) {
      const reqDoc = await db.collection("joinRequests").findOne({
        rideOfferId,
        requesterUserId: senderUserId,
        status: { $in: ["Pending", "Accepted", "Rejected", "Cancelled", "Left"] }
      });
      if (reqDoc) isConnected = true;
    } else {
      // Neither party is the offer owner — not a valid ride messaging pair
    }

    if (!isConnected) {
      return res.status(403).json({ message: "You can only message users connected to this ride offer." });
    }

    const now = new Date();
    const messageDoc = {
      rideOfferId,
      joinRequestId: req.body.joinRequestId && ObjectId.isValid(req.body.joinRequestId) ? new ObjectId(req.body.joinRequestId) : null,
      senderUserId,
      recipientUserId,
      content: req.body.content.trim(),
      createdAt: now
    };

    const result = await db.collection("messages").insertOne(messageDoc);
    const inserted = { ...messageDoc, _id: result.insertedId };

    const [senderProfile, recipientProfile] = await Promise.all([
      db.collection("profiles").findOne({ userId: senderUserId }),
      db.collection("profiles").findOne({ userId: recipientUserId })
    ]);

    const serialized = toMessage(inserted, senderProfile, recipientProfile);
    res.status(201).json({
      message: "Message sent successfully.",
      data: serialized,
      messageItem: serialized
    });
  }));

  // Fetch message thread
  app.get("/api/messages", requireAuth, asyncRoute(async (req, res) => {
    const { rideOfferId, withUserId } = req.query;
    if (!rideOfferId || !ObjectId.isValid(rideOfferId)) {
      return res.status(400).json({ message: "Valid rideOfferId query parameter is required." });
    }

    const db = await connectToDatabase();
    const offerId = new ObjectId(rideOfferId);
    const offer = await db.collection("rideOffers").findOne({ _id: offerId });
    if (!offer) return res.status(404).json({ message: "Ride offer not found." });

    const ownerIdStr = (offer.userId || offer.driverId || "").toString();
    const currentUserIdStr = req.user._id.toString();

    let filter = { rideOfferId: offerId };
    if (withUserId && ObjectId.isValid(withUserId)) {
      const otherId = new ObjectId(withUserId);
      const otherIdStr = withUserId.toString();

      const isCallerOwner = currentUserIdStr === ownerIdStr;
      const isOtherOwner = otherIdStr === ownerIdStr;

      if (!isCallerOwner && !isOtherOwner) {
        return res.status(403).json({ message: "You cannot view messages for this conversation." });
      }

      let isConnected = false;
      if (isCallerOwner) {
        const reqDoc = await db.collection("joinRequests").findOne({ rideOfferId: offerId, requesterUserId: otherId, status: { $in: ["Pending", "Accepted", "Rejected", "Cancelled", "Left"] } });
        if (reqDoc) isConnected = true;
      } else if (isOtherOwner) {
        const reqDoc = await db.collection("joinRequests").findOne({ rideOfferId: offerId, requesterUserId: req.user._id, status: { $in: ["Pending", "Accepted", "Rejected", "Cancelled", "Left"] } });
        if (reqDoc) isConnected = true;
      }

      if (!isConnected) {
        return res.status(403).json({ message: "You cannot view messages for this conversation." });
      }

      filter.$or = [
        { senderUserId: req.user._id, recipientUserId: otherId },
        { senderUserId: otherId, recipientUserId: req.user._id }
      ];
    } else {

      filter.$or = [
        { senderUserId: req.user._id },
        { recipientUserId: req.user._id }
      ];
    }

    const messages = await db.collection("messages").find(filter).sort({ createdAt: 1 }).toArray();

    const userIds = [...new Set(messages.flatMap((m) => [(m.senderUserId || "").toString(), (m.recipientUserId || "").toString()]))].filter(Boolean);
    const profiles = await db.collection("profiles").find({ userId: { $in: userIds.map((id) => new ObjectId(id)) } }).toArray();
    const profilesMap = new Map(profiles.map((p) => [(p.userId || "").toString(), p]));

    const serialized = messages.map((m) =>
      toMessage(m, profilesMap.get(m.senderUserId.toString()), profilesMap.get(m.recipientUserId.toString()))
    );

    res.json({ messages: serialized });
  }));

  // Fetch active conversations for user
  // Conversations are built from two sources:
  //   1. Accepted join requests (ride owner <-> requester) — always visible
  //   2. Any previously sent/received messages
  app.get("/api/messages/conversations", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const currentUserId = req.user._id;
    const currentUserIdStr = currentUserId.toString();

    // Source 1: accepted join requests where current user is owner or requester
    const joinRequests = await db.collection("joinRequests").find({
      $or: [
        { ownerUserId: currentUserId, status: { $in: ["Pending", "Accepted"] } },
        { requesterUserId: currentUserId, status: { $in: ["Pending", "Accepted"] } }
      ]
    }).toArray();

    // Source 2: messages the user has sent or received
    const messageHistory = await db.collection("messages").find({
      $or: [{ senderUserId: currentUserId }, { recipientUserId: currentUserId }]
    }).sort({ createdAt: -1 }).toArray();

    // Build a unified conversations map keyed by "offerId_partnerId"
    const conversationsMap = new Map();

    // Seed from join requests first (so conversations exist even before first message)
    for (const jreq of joinRequests) {
      const isOwner = (jreq.ownerUserId || "").toString() === currentUserIdStr;
      const partnerId = isOwner
        ? (jreq.requesterUserId || "").toString()
        : (jreq.ownerUserId || "").toString();
      if (!partnerId || partnerId === currentUserIdStr) continue;
      const offerId = (jreq.rideOfferId || "").toString();
      if (!offerId) continue;
      const key = `${offerId}_${partnerId}`;
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          rideOfferId: offerId,
          partnerUserId: partnerId,
          lastMessage: null
        });
      }
    }

    // Overlay message history (update lastMessage)
    for (const msg of messageHistory) {
      const partnerId = msg.senderUserId.toString() === currentUserIdStr
        ? (msg.recipientUserId || "").toString()
        : (msg.senderUserId || "").toString();
      const offerId = (msg.rideOfferId || "").toString();
      const key = `${offerId}_${partnerId}`;

      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          rideOfferId: offerId,
          partnerUserId: partnerId,
          lastMessage: msg
        });
      } else {
        const existing = conversationsMap.get(key);
        if (!existing.lastMessage) {
          conversationsMap.get(key).lastMessage = msg;
        }
      }
    }

    const convList = Array.from(conversationsMap.values());
    if (!convList.length) return res.json({ conversations: [] });

    const offerIds = [...new Set(convList.map((c) => c.rideOfferId))].filter(Boolean).map((id) => new ObjectId(id));
    const partnerIds = [...new Set(convList.map((c) => c.partnerUserId))].filter(Boolean).map((id) => new ObjectId(id));

    const [offers, partnerProfiles, partnerUsers] = await Promise.all([
      db.collection("rideOffers").find({ _id: { $in: offerIds } }).toArray(),
      db.collection("profiles").find({ userId: { $in: partnerIds } }).toArray(),
      db.collection("users").find({ _id: { $in: partnerIds } }).toArray()
    ]);

    const offersMap = new Map(offers.map((o) => [o._id.toString(), o]));
    const partnerProfilesMap = new Map(partnerProfiles.map((p) => [(p.userId || "").toString(), p]));
    const partnerUsersMap = new Map(partnerUsers.map((u) => [u._id.toString(), u]));

    const result = convList.map((c) => {
      const offer = offersMap.get(c.rideOfferId);
      const profile = partnerProfilesMap.get(c.partnerUserId);
      const user = partnerUsersMap.get(c.partnerUserId);
      return {
        id: `${c.rideOfferId}_${c.partnerUserId}`,
        rideOfferId: c.rideOfferId,
        partnerUserId: c.partnerUserId,
        partner: {
          id: c.partnerUserId,
          name: user?.name || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "User",
          firstName: profile?.firstName || "",
          lastName: profile?.lastName || "",
          phoneNumber: profile?.phoneNumber || ""
        },
        offer: offer ? {
          id: offer._id.toString(),
          origin: offer.origin,
          destination: offer.destination,
          departureDate: offer.departureDate,
          departureTime: offer.departureTime,
          status: offer.status
        } : null,
        lastMessage: c.lastMessage ? {
          content: c.lastMessage.content,
          createdAt: c.lastMessage.createdAt,
          senderUserId: (c.lastMessage.senderUserId || "").toString()
        } : null
      };
    });

    res.json({ conversations: result });
  }));

  // ── US-20: Journey History Endpoint ───────────────────────────────────────
  app.get("/api/journeys", requireAuth, asyncRoute(async (req, res) => {
    const db = await connectToDatabase();
    const currentUserId = req.user._id;

    // 1. User's owned offers
    const ownedOffers = await db.collection("rideOffers").find({
      $or: [{ userId: currentUserId }, { driverId: currentUserId }, { ownerUserId: currentUserId }]
    }).toArray();

    // 2. User's join requests
    const myRequests = await db.collection("joinRequests").find({
      requesterUserId: currentUserId
    }).toArray();

    const offerIds = [...new Set(myRequests.map((r) => r.rideOfferId).filter(Boolean))];
    const ownerIds = [...new Set(myRequests.map((r) => r.ownerUserId).filter(Boolean))];

    const [requestedOffers, ownerProfiles] = await Promise.all([
      db.collection("rideOffers").find({ _id: { $in: offerIds } }).toArray(),
      db.collection("profiles").find({ userId: { $in: ownerIds } }).toArray()
    ]);

    const requestedOffersMap = new Map(requestedOffers.map((o) => [o._id.toString(), o]));
    const ownerProfilesMap = new Map(ownerProfiles.map((p) => [p.userId.toString(), p]));

    const upcoming = [];
    const previous = [];
    const now = new Date();
    const todayStr = now.toDateString();

    // Day-name and relative-date keywords that are always in the future
    const FUTURE_KEYWORDS = ["tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next week"];

    const isFutureJourney = (dateStr, timeStr, status) => {
      if (!dateStr) {
        // No date info — use status as fallback
        return status === "Active" || status === "Pending";
      }

      const dateLower = dateStr.toLowerCase().trim();

      // Human-readable relative dates are always upcoming
      if (FUTURE_KEYWORDS.some((kw) => dateLower.includes(kw))) {
        return true;
      }

      // Try parsing a real date string (e.g. "2026-09-01", "Sep 1 2026")
      const parsed = new Date(`${dateStr} ${timeStr || "23:59"}`);
      if (!isNaN(parsed.getTime())) {
        return parsed >= now;
      }

      // Try date-only parse
      const dateOnly = new Date(dateStr);
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly >= new Date(todayStr);
      }

      // Last resort: fall back to offer status
      return status === "Active" || status === "Pending";
    };

    for (const offer of ownedOffers) {
      const isFuture = isFutureJourney(offer.departureDate, offer.departureTime, offer.status);
      const isCancelled = offer.status === "Cancelled";
      const isCompleted = offer.status === "Completed";

      const item = {
        id: offer._id.toString(),
        type: "offer",
        role: "Offer Owner",
        origin: offer.origin,
        destination: offer.destination,
        departureDate: offer.departureDate,
        departureTime: offer.departureTime,
        timeWindow: offer.timeWindow,
        availableSeats: offer.availableSeats,
        acceptedPassengers: offer.acceptedPassengers || 0,
        status: offer.status,
        createdAt: offer.createdAt
      };

      if (isFuture && !isCancelled && !isCompleted) {
        upcoming.push(item);
      } else {
        previous.push(item);
      }
    }


    for (const reqItem of myRequests) {
      const offer = requestedOffersMap.get((reqItem.rideOfferId || "").toString());
      const ownerProfile = ownerProfilesMap.get((reqItem.ownerUserId || "").toString());

      const isFuture = offer ? isFutureJourney(offer.departureDate, offer.departureTime, offer.status) : false;
      const isFinalState = ["Cancelled", "Rejected", "Left"].includes(reqItem.status) || offer?.status === "Cancelled";

      const item = {
        id: reqItem._id.toString(),
        rideOfferId: reqItem.rideOfferId ? reqItem.rideOfferId.toString() : "",
        type: "request",
        role: "Requester",
        status: reqItem.status,
        origin: offer?.origin || "Journey",
        destination: offer?.destination || "",
        departureDate: offer?.departureDate || "",
        departureTime: offer?.departureTime || "",
        timeWindow: offer?.timeWindow || "",
        offerStatus: offer?.status || "",
        ownerName: ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}`.trim() : "Ride Owner",
        requestedAt: reqItem.requestedAt,
        decidedAt: reqItem.decidedAt
      };

      if (isFuture && !isFinalState) {
        upcoming.push(item);
      } else {
        previous.push(item);
      }
    }

    res.json({ upcoming, previous });
  }));
}

