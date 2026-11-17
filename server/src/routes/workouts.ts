import { Router } from "express";
import { z } from "zod";
import { Workout, WORKOUT_TYPES } from "../models/Workout";
import { ActivityLog } from "../models/ActivityLog";
import { wrap, HttpError } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { emitEvent } from "../realtime";
import { dayKey } from "../lib/dates";

const router = Router();
router.use(authRequired);

const workoutSchema = z.object({
  type: z.enum(WORKOUT_TYPES),
  title: z.string().min(1, "Give your workout a title"),
  durationMin: z.number().int().min(1, "Duration must be at least 1 minute"),
  calories: z.number().min(0),
  distanceKm: z.number().min(0).optional(),
  intensity: z.enum(["Low", "Moderate", "High"]).optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

// Roll a workout's calories/minutes/distance into that day's activity log.
async function syncActivity(userId: string, when: Date) {
  const day = dayKey(when);
  const workouts = await Workout.find({
    user: userId,
    date: {
      $gte: new Date(`${day}T00:00:00`),
      $lte: new Date(`${day}T23:59:59.999`),
    },
  });
  const calories = workouts.reduce((s, w) => s + w.calories, 0);
  const activeMinutes = workouts.reduce((s, w) => s + w.durationMin, 0);
  const distanceKm = Math.round(workouts.reduce((s, w) => s + (w.distanceKm || 0), 0) * 100) / 100;

  const log = await ActivityLog.findOneAndUpdate(
    { user: userId, day },
    { $set: { calories, activeMinutes, distanceKm }, $setOnInsert: { steps: Math.round(distanceKm * 1312) } },
    { new: true, upsert: true }
  );
  emitEvent("activity:updated", { log: log?.toJSON() });
  return log;
}

// GET /api/workouts — recent workouts (optional ?type=&limit=)
router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const filter: Record<string, unknown> = { user: req.userId };
    if (req.query.type) filter.type = req.query.type;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const workouts = await Workout.find(filter).sort({ date: -1 }).limit(limit);
    res.json({ workouts });
  })
);

// GET /api/workouts/stats — totals by type (all-time)
router.get(
  "/stats",
  wrap(async (req: AuthRequest, res) => {
    const workouts = await Workout.find({ user: req.userId });
    const byType = new Map<string, { type: string; count: number; minutes: number; calories: number }>();
    for (const w of workouts) {
      const e = byType.get(w.type) || { type: w.type, count: 0, minutes: 0, calories: 0 };
      e.count += 1;
      e.minutes += w.durationMin;
      e.calories += w.calories;
      byType.set(w.type, e);
    }
    res.json({
      total: workouts.length,
      totalMinutes: workouts.reduce((s, w) => s + w.durationMin, 0),
      totalCalories: workouts.reduce((s, w) => s + w.calories, 0),
      byType: [...byType.values()].sort((a, b) => b.count - a.count),
    });
  })
);

router.post(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const body = workoutSchema.parse(req.body);
    const date = body.date ? new Date(body.date) : new Date();
    const workout = await Workout.create({ ...body, date, user: req.userId });
    await syncActivity(req.userId!, date);
    emitEvent("workout:created", { workout: workout.toJSON() });
    res.status(201).json({ workout });
  })
);

router.delete(
  "/:id",
  wrap(async (req: AuthRequest, res) => {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!workout) throw new HttpError(404, "Workout not found.");
    await syncActivity(req.userId!, workout.date);
    res.status(204).end();
  })
);

export default router;
