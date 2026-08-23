export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
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
    driverId: offer.driverId.toString(),
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
