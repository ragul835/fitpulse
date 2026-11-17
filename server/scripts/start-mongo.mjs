import { MongoMemoryServer } from "mongodb-memory-server";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../data/mongo");
const PORT = Number(process.env.MONGO_PORT || 27018);

import fs from "fs";
fs.mkdirSync(DB_PATH, { recursive: true });

console.log(`🍃 Starting FitPulse MongoDB on port ${PORT} (persistent: ${DB_PATH})…`);

const mongod = await MongoMemoryServer.create({
  instance: {
    port: PORT,
    dbPath: DB_PATH,
    storageEngine: "wiredTiger",
  },
});

const uri = mongod.getUri();
console.log(`✅ MongoDB running at ${uri}`);
console.log("   Leave this process running. Press Ctrl+C to stop.");

async function shutdown() {
  console.log("\n⏹  Stopping MongoDB…");
  await mongod.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
