import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "./config.js";
import { connectToDatabase } from "./db.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Authentication required." });

    const decoded = jwt.verify(token, config.jwtSecret);
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.sub) });
    if (!user) return res.status(401).json({ message: "Authentication required." });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Authentication required." });
  }
}
