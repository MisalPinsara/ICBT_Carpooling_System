import dotenv from "dotenv";

const envPath = new URL(".env", import.meta.url);
dotenv.config({ path: envPath });

export const config = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB || "icbt_carpooling_system",
  mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || "").split(",").map((server) => server.trim()).filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || "local-only-secret"
};

if (!config.mongoUri) {
  throw new Error("MONGODB_URI is required. Add it to server/.env before starting the server.");
}