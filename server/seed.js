import { ObjectId } from "mongodb";
import { connectToDatabase, closeDatabase } from "./db.js";
import { hashPassword } from "./auth.js";

const now = new Date();
const kasunId = new ObjectId();
const nethmiId = new ObjectId();

async function seed() {
  const db = await connectToDatabase();

  await db.collection("users").updateOne(
    { email: "kasun@icbt.lk" },
    {
      $set: {
      name: "Kasun Fernando",
      email: "kasun@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      role: "Driver",
      createdAt: now
      },
      $setOnInsert: { _id: kasunId }
    },
    { upsert: true }
  );
  await db.collection("users").updateOne(
    { email: "nethmi@icbt.lk" },
    {
      $set: {
      name: "Nethmi Perera",
      email: "nethmi@icbt.lk",
      passwordHash: await hashPassword("Password123"),
      role: "Passenger",
      createdAt: now
      },
      $setOnInsert: { _id: nethmiId }
    },
    { upsert: true }
  );

  const kasun = await db.collection("users").findOne({ email: "kasun@icbt.lk" });
  const nethmi = await db.collection("users").findOne({ email: "nethmi@icbt.lk" });

  await db.collection("profiles").updateOne(
    { userId: kasun._id },
    {
      $set: {
      userId: kasun._id,
      firstName: "Kasun",
      lastName: "Fernando",
      phoneNumber: "+94 76 456 7890",
      studentStaffId: "ICBT2024DRVR",
      homeRoute: "Maharagama -> ICBT Campus",
      travelPreferences: ["Morning commute"],
      vehicleInformation: { model: "Toyota Aqua", plateNumber: "WP CAD 1234" },
      accountType: "ICBT Student",
      updatedAt: now
      }
    },
    { upsert: true }
  );
  await db.collection("profiles").updateOne(
    { userId: nethmi._id },
    {
      $set: {
      userId: nethmi._id,
      firstName: "Nethmi",
      lastName: "Perera",
      phoneNumber: "+94 77 123 4567",
      studentStaffId: "ICBT2024XXXX",
      homeRoute: "Panadura -> ICBT Campus",
      travelPreferences: ["Quiet ride", "Morning classes"],
      vehicleInformation: null,
      accountType: "ICBT Student",
      updatedAt: now
      }
    },
    { upsert: true }
  );

  const rideOfferIds = [new ObjectId(), new ObjectId(), new ObjectId()];
  const rideSeeds = [
    {
      seedKey: "kasun-maharagama-campus",
      userId: kasun._id,
      origin: "Maharagama",
      destination: "ICBT Campus",
      departureDate: "Tomorrow",
      departureTime: "7:30 AM",
      timeWindow: "7:00 AM - 8:00 AM",
      availableSeats: 2,
      acceptedPassengers: 3,
      status: "Active",
      createdAt: new Date(now.getTime() - 10 * 60 * 1000)
    },
    {
      seedKey: "kasun-nugegoda-campus",
      userId: kasun._id,
      origin: "Nugegoda",
      destination: "ICBT Campus",
      departureDate: "Friday",
      departureTime: "8:10 AM",
      timeWindow: "7:45 AM - 8:30 AM",
      availableSeats: 0,
      acceptedPassengers: 4,
      status: "Active",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      seedKey: "kasun-campus-maharagama",
      userId: kasun._id,
      origin: "ICBT Campus",
      destination: "Maharagama",
      departureDate: "Monday",
      departureTime: "5:15 PM",
      timeWindow: "5:00 PM - 5:45 PM",
      availableSeats: 0,
      acceptedPassengers: 4,
      status: "Active",
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000)
    }
  ];

  for (const [index, ride] of rideSeeds.entries()) {
    await db.collection("rideOffers").updateOne(
      { seedKey: ride.seedKey },
      { $set: ride, $setOnInsert: { _id: rideOfferIds[index] } },
      { upsert: true }
    );
  }

  const primaryRide = await db.collection("rideOffers").findOne({ seedKey: "kasun-maharagama-campus" });
  const secondRide = await db.collection("rideOffers").findOne({ seedKey: "kasun-nugegoda-campus" });

  await db.collection("joinRequests").updateOne(
    { seedKey: "nethmi-primary-pending" },
    {
      $set: {
        seedKey: "nethmi-primary-pending",
        rideOfferId: primaryRide._id,
        requesterUserId: nethmi._id,
        ownerUserId: kasun._id,
        status: "Pending",
        requestNote: "",
        requestedAt: now,
        updatedAt: now
      }
    },
    { upsert: true }
  );
  await db.collection("joinRequests").updateOne(
    { seedKey: "nethmi-second-pending" },
    {
      $set: {
        seedKey: "nethmi-second-pending",
        rideOfferId: secondRide._id,
        requesterUserId: nethmi._id,
        ownerUserId: kasun._id,
        status: "Pending",
        requestNote: "",
        requestedAt: now,
        updatedAt: now
      }
    },
    { upsert: true }
  );

  await db.collection("rideOfferDrafts").updateOne(
    { userId: kasun._id },
    {
      $set: {
        userId: kasun._id,
        origin: "Maharagama",
        destination: "ICBT Campus",
        departureDate: "Tomorrow",
        departureTime: "7:30 AM",
        timeWindow: "7:00 AM - 8:00 AM",
        availableSeats: 3,
        updatedAt: now
      }
    },
    { upsert: true }
  );

  await db.collection("activities").updateOne(
    { seedKey: "kasun-nethmi-request" },
    {
      $set: {
        seedKey: "kasun-nethmi-request",
        userId: kasun._id,
        title: "Nethmi Perera requested to join your ride",
        route: "Maharagama -> ICBT Campus",
        status: "PENDING",
        createdLabel: "10 minutes ago",
        createdAt: now
      }
    },
    { upsert: true }
  );

  console.log("Seeded MongoDB database without deleting existing data: icbt_carpooling_system");
  console.log("Demo logins: kasun@icbt.lk / Password123 and nethmi@icbt.lk / Password123");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
