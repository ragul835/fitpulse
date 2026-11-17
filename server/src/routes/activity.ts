import { Router } from "express";
import { z } from "zod";
import { ActivityLog } from "../models/ActivityLog";
import { wrap } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { emitEvent } from "../realtime";
import { dayKey, lastNDays } from "../lib/dates";

const router = Router();
router.use(authRequired);

// GET /api/activity/today
router.get(
  "/today",
  wrap(async (req: AuthRequest, res) => {
    const day = dayKey();
    const log = await ActivityLog.findOne({ user: req.userId, day });
    res.json({ day, log: log?.toJSON() || { day, steps: 0, calories: 0, activeMinutes: 0, distanceKm: 0 } });
  })
);

// GET /api/activity/range?days=7 — ordered oldest→newest, gaps filled with zeroes
router.get(
  "/range",
  wrap(async (req: AuthRequest, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const keys = lastNDays(days);
    const logs = await ActivityLog.find({ user: req.userId, day: { $in: keys } });
    const map = new Map(logs.map((l) => [l.day, l]));
    const series = keys.map((day) => {
      const l = map.get(day);
      return {
        day,
        steps: l?.steps || 0,
        calories: l?.calories || 0,
        activeMinutes: l?.activeMinutes || 0,
        distanceKm: l?.distanceKm || 0,
        waterMl: l?.waterMl || 0,
      };
    });
    res.json({ series });
  })
);

const logSchema = z.object({
  day: z.string().optional(),
  steps: z.number().int().min(0).optional(),
  calories: z.number().min(0).optional(),
  activeMinutes: z.number().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
  restingHr: z.number().min(0).optional(),
  sleepHours: z.number().min(0).optional(),
});

// POST /api/activity — upsert today's (or given day's) metrics
router.post(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const body = logSchema.parse(req.body);
    const day = body.day || dayKey();
    const { day: _d, ...fields } = body;
    const log = await ActivityLog.findOneAndUpdate(
      { user: req.userId, day },
      { $set: fields },
      { new: true, upsert: true }
    );
    emitEvent("activity:updated", { log: log?.toJSON() });
    res.json({ log });
  })
);

// POST /api/activity/add-steps — quick increment for today
router.post(
  "/add-steps",
  wrap(async (req: AuthRequest, res) => {
    const amount = Number(req.body?.amount) || 1000;
    const day = dayKey();
    const log = await ActivityLog.findOneAndUpdate(
      { user: req.userId, day },
      { $inc: { steps: amount, distanceKm: Math.round((amount / 1312) * 100) / 100 } },
      { new: true, upsert: true }
    );
    emitEvent("activity:updated", { log: log?.toJSON() });
    res.json({ log });
  })
);

// POST /api/activity/add-water — add/subtract water (ml) for today
router.post(
  "/add-water",
  wrap(async (req: AuthRequest, res) => {
    const amount = Number(req.body?.amount) || 250;
    const day = dayKey();
    const existing = await ActivityLog.findOne({ user: req.userId, day });
    const next = Math.max(0, (existing?.waterMl || 0) + amount);
    const log = await ActivityLog.findOneAndUpdate(
      { user: req.userId, day },
      { $set: { waterMl: next } },
      { new: true, upsert: true }
    );
    emitEvent("activity:updated", { log: log?.toJSON() });
    res.json({ log });
  })
);

export default router;
