import { Router } from "express";
import { Workout } from "../models/Workout";
import { ActivityLog } from "../models/ActivityLog";
import { wrap } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { lastNDays } from "../lib/dates";

const router = Router();
router.use(authRequired);

interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  value: number;
  target: number;
}

// GET /api/achievements — badges computed from the user's data
router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const workouts = await Workout.find({ user: req.userId });
    const logs = await ActivityLog.find({ user: req.userId });

    const totalWorkouts = workouts.length;
    const totalDistance = Math.round(workouts.reduce((s, w) => s + (w.distanceKm || 0), 0));
    const totalCalories = workouts.reduce((s, w) => s + w.calories, 0);
    const totalMinutes = workouts.reduce((s, w) => s + w.durationMin, 0);
    const typesUsed = new Set(workouts.map((w) => w.type)).size;
    const bestSteps = Math.max(0, ...logs.map((l) => l.steps || 0));

    // Longest active-day streak over the last 90 days.
    const keys = lastNDays(90);
    const activeSet = new Set(logs.filter((l) => (l.activeMinutes || 0) > 0).map((l) => l.day));
    let longest = 0;
    let run = 0;
    for (const k of keys) {
      if (activeSet.has(k)) {
        run += 1;
        longest = Math.max(longest, run);
      } else run = 0;
    }

    const def: Badge[] = [
      { id: "first-workout", title: "First Steps", desc: "Log your first workout", icon: "🎉", tier: "bronze", value: totalWorkouts, target: 1 },
      { id: "workouts-10", title: "Getting Consistent", desc: "Log 10 workouts", icon: "🔁", tier: "bronze", value: totalWorkouts, target: 10 },
      { id: "workouts-50", title: "Dedicated", desc: "Log 50 workouts", icon: "💪", tier: "gold", value: totalWorkouts, target: 50 },
      { id: "streak-7", title: "Week Warrior", desc: "7-day active streak", icon: "🔥", tier: "silver", value: longest, target: 7 },
      { id: "streak-14", title: "Unstoppable", desc: "14-day active streak", icon: "⚡", tier: "gold", value: longest, target: 14 },
      { id: "distance-50", title: "Road Runner", desc: "Cover 50 km total", icon: "🛣️", tier: "silver", value: totalDistance, target: 50 },
      { id: "distance-200", title: "Century Club", desc: "Cover 200 km total", icon: "🏅", tier: "gold", value: totalDistance, target: 200 },
      { id: "calories-10k", title: "Furnace", desc: "Burn 10,000 kcal", icon: "🔥", tier: "silver", value: totalCalories, target: 10000 },
      { id: "steps-15k", title: "Big Mover", desc: "15,000 steps in a day", icon: "👟", tier: "silver", value: bestSteps, target: 15000 },
      { id: "variety-5", title: "All-Rounder", desc: "Try 5 workout types", icon: "🌈", tier: "silver", value: typesUsed, target: 5 },
      { id: "minutes-1000", title: "Marathoner", desc: "1,000 active minutes", icon: "⏱️", tier: "gold", value: totalMinutes, target: 1000 },
    ];

    const badges = def.map((b) => ({ ...b, unlocked: b.value >= b.target, progress: Math.min(1, b.value / b.target) }));
    res.json({
      badges,
      unlockedCount: badges.filter((b) => b.unlocked).length,
      total: badges.length,
      stats: { totalWorkouts, totalDistance, totalCalories, totalMinutes, longestStreak: longest, bestSteps },
    });
  })
);

export default router;
