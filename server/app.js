import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { registerRoutes } from "./routes.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());
  registerRoutes(app);

  app.use((err, req, res, next) => {
    console.error(err);
    if (err.name === "MongoServerSelectionError" || err.name === "MongoNetworkError") {
      return res.status(503).json({ message: "Database connection is temporarily unavailable. Please try again." });
    }
    res.status(500).json({ message: "Something went wrong." });
  });

  return app;
}
