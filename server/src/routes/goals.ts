import { Router } from "express";
import { z } from "zod";
import { Goal, GOAL_METRICS } from "../models/Goal";
import { Workout } from "../models/Workout";
import { ActivityLog } from "../models/ActivityLog";
import { wrap, HttpError } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { dayKey, lastNDays, startOfWeek } from "../lib/dates";

const router = Router();
router.use(authRequired);

const goalSchema = z.object({
  title: z.string().min(1, "Give your goal a title"),
  metric: z.enum(GOAL_METRICS),
  target: z.number().min(1),
  period: z.enum(["daily", "weekly"]).optional(),
});

// Compute current progress for a goal from logged data.
async function progressFor(userId: string, metric: string, period: string): Promise<number> {
  const keys = period === "daily" ? [dayKey()] : lastNDays(7);

  if (metric === "workouts") {
    const since = period === "daily" ? new Date(`${dayKey()}T00:00:00`) : startOfWeek();
    return Workout.countDocuments({ user: userId, date: { $gte: since } });
  }

  const logs = await ActivityLog.find({ user: userId, day: { $in: keys } });
  const field = metric === "distance" ? "distanceKm" : metric; // steps|calories|activeMinutes|distanceKm
  return logs.reduce((s, l) => s + ((l as unknown as Record<string, number>)[field] || 0), 0);
}

router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const goals = await Goal.find({ user: req.userId }).sort({ createdAt: -1 });
    const withProgress = await Promise.all(
      goals.map(async (g) => ({
        ...g.toJSON(),
        current: Math.round(await progressFor(req.userId!, g.metric, g.period)),
      }))
    );
    res.json({ goals: withProgress });
  })
);

router.post(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const body = goalSchema.parse(req.body);
    const goal = await Goal.create({ ...body, user: req.userId });
    res.status(201).json({ goal: goal.toJSON() });
  })
);

router.patch(
  "/:id",
  wrap(async (req: AuthRequest, res) => {
    const schema = goalSchema.partial().extend({ active: z.boolean().optional() });
    const body = schema.parse(req.body);
    const goal = await Goal.findOneAndUpdate({ _id: req.params.id, user: req.userId }, body, { new: true });
    if (!goal) throw new HttpError(404, "Goal not found.");
    res.json({ goal: goal.toJSON() });
  })
);

router.delete(
  "/:id",
  wrap(async (req: AuthRequest, res) => {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!goal) throw new HttpError(404, "Goal not found.");
    res.status(204).end();
  })
);

export default router;
