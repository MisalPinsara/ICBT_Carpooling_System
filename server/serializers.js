export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function toProfile(profile) {
  if (!profile) return null;
  return {
    id: profile._id ? profile._id.toString() : "",
    userId: profile.userId ? profile.userId.toString() : "",
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    phoneNumber: profile.phoneNumber || "",
    studentStaffId: profile.studentStaffId || "",
    homeRoute: profile.homeRoute || "",
    travelPreferences: profile.travelPreferences || [],
    vehicleInformation: profile.vehicleInformation || null,
    accountType: profile.accountType || "",
    updatedAt: profile.updatedAt
  };
}

export function toRideOffer(offer, passengers = []) {
  if (!offer) return null;
  const rawUserId = offer.userId || offer.driverId;
  return {
    id: offer._id ? offer._id.toString() : "",
    userId: rawUserId ? rawUserId.toString() : "",
    origin: offer.origin,
    destination: offer.destination,
    departureDate: offer.departureDate,
    departureTime: offer.departureTime,
    timeWindow: offer.timeWindow,
    availableSeats: offer.availableSeats,
    acceptedPassengers: offer.acceptedPassengers || 0,
    passengers,
    status: offer.status,
    createdAt: offer.createdAt
  };
}

// Sprint 2: privacy-aware serializer for public offer listings/detail.
// Omits driverId/userId, acceptedPassengers, passengers list and private contact data.
export function toPublicRideOffer(offer, ownerSummary = null) {
  if (!offer) return null;
  return {
    id: offer._id ? offer._id.toString() : "",
    origin: offer.origin,
    destination: offer.destination,
    departureDate: offer.departureDate,
    departureTime: offer.departureTime,
    timeWindow: offer.timeWindow,
    availableSeats: offer.availableSeats,
    status: offer.status,
    createdAt: offer.createdAt,
    // Only expose first/last name of the offer owner — no phone or email
    owner: ownerSummary
      ? { firstName: ownerSummary.firstName, lastName: ownerSummary.lastName }
      : null
  };
}

// Sprint 2: join-request serializer with embedded offer summary and optional owner details.
export function toJoinRequest(joinReq, offerSummary = null, ownerSummary = null) {
  if (!joinReq) return null;
  const ownerId = joinReq.ownerUserId || joinReq.driverId || "";
  return {
    id: joinReq._id ? joinReq._id.toString() : "",
    rideOfferId: joinReq.rideOfferId ? joinReq.rideOfferId.toString() : "",
    ownerUserId: ownerId ? ownerId.toString() : "",
    status: joinReq.status,
    requestNote: joinReq.requestNote || "",
    requestedAt: joinReq.requestedAt,
    updatedAt: joinReq.updatedAt,
    offer: offerSummary
      ? {
          id: offerSummary._id ? offerSummary._id.toString() : "",
          origin: offerSummary.origin,
          destination: offerSummary.destination,
          departureDate: offerSummary.departureDate,
          departureTime: offerSummary.departureTime,
          timeWindow: offerSummary.timeWindow,
          availableSeats: offerSummary.availableSeats,
          status: offerSummary.status
        }
      : null,
    owner: ownerSummary
      ? { firstName: ownerSummary.firstName, lastName: ownerSummary.lastName }
      : null
  };
}
