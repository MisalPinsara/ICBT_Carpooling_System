import { MongoClient } from "mongodb";
import dns from "node:dns";
import { config } from "./config.js";

let client;
let db;
let dnsConfigured = false;

export async function connectToDatabase() {
  if (db) return db;

  if (!dnsConfigured && config.mongoDnsServers.length && config.mongoUri.startsWith("mongodb+srv://")) {
    dns.setServers(config.mongoDnsServers);
    dnsConfigured = true;
  }

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);
  await ensureIndexes(db);
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

async function ensureIndexes(database) {
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
    database.collection("rideOffers").createIndex({ driverId: 1, status: 1 }),
    database.collection("rideOfferDrafts").createIndex({ driverId: 1 }, { unique: true }),
    database.collection("joinRequests").createIndex({ seedKey: 1 }, { unique: true, sparse: true }),
    database.collection("activities").createIndex({ seedKey: 1 }, { unique: true, sparse: true }),
    database.collection("activities").createIndex({ userId: 1, createdAt: -1 })
  ]);
}
