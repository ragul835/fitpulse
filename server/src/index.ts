import express from "express";
import cors from "cors";
import { createServer } from "http";
import { env } from "./env";
import { connectDB } from "./db";
import { initRealtime } from "./realtime";
import { errorHandler } from "./lib/http";
import authRoutes from "./routes/auth";
import workoutRoutes from "./routes/workouts";
import activityRoutes from "./routes/activity";
import goalRoutes from "./routes/goals";
import dashboardRoutes from "./routes/dashboard";
import weightRoutes from "./routes/weight";
import achievementRoutes from "./routes/achievements";
import leaderboardRoutes from "./routes/leaderboard";

const app = express();
app.use(cors({ origin: env.clientUrl === "*" ? true : env.clientUrl, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "fitpulse-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.use(errorHandler);

const server = createServer(app);
initRealtime(server);

connectDB()
  .then(() => {
    server.listen(env.port, () => {
      console.log(`💪 FitPulse API on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error("Is MongoDB running? Start it with: npm run mongo");
    process.exit(1);
  });
