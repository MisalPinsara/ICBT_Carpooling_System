import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectToDatabase } from "./db.js";

await waitForDatabase();

const server = createApp().listen(config.port, () => {
  console.log(`ICBT Carpool API running on http://127.0.0.1:${config.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Stop the existing API server or change PORT in .env.`);
    process.exit(1);
  }
  throw error;
});

async function waitForDatabase() {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await connectToDatabase();
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`MongoDB connection failed, retrying (${attempt}/${attempts})...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
}
