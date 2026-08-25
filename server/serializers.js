export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function toProfile(profile) {
  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    firstName: profile.firstName,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber,
    studentStaffId: profile.studentStaffId,
    homeRoute: profile.homeRoute,
    travelPreferences: profile.travelPreferences,
    vehicleInformation: profile.vehicleInformation,
    accountType: profile.accountType,
    updatedAt: profile.updatedAt
  };
}

export function toRideOffer(offer, passengers = []) {
  return {
    id: offer._id.toString(),
    userId: offer.userId.toString(),
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
// Omits driverId, acceptedPassengers, passengers list and private contact data.
export function toPublicRideOffer(offer, ownerSummary = null) {
  return {
    id: offer._id.toString(),
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

// Sprint 2: join-request serializer with embedded offer summary.
export function toJoinRequest(joinReq, offerSummary = null) {
  return {
    id: joinReq._id.toString(),
    rideOfferId: joinReq.rideOfferId.toString(),
    ownerUserId: joinReq.ownerUserId.toString(),
    status: joinReq.status,
    requestNote: joinReq.requestNote || "",
    requestedAt: joinReq.requestedAt,
    updatedAt: joinReq.updatedAt,
    offer: offerSummary
      ? {
          origin: offerSummary.origin,
          destination: offerSummary.destination,
          departureDate: offerSummary.departureDate,
          departureTime: offerSummary.departureTime,
          timeWindow: offerSummary.timeWindow,
          status: offerSummary.status
        }
      : null
  };
}
