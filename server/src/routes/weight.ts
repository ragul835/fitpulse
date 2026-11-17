import { Router } from "express";
import { z } from "zod";
import { WeightEntry } from "../models/WeightEntry";
import { User } from "../models/User";
import { wrap, HttpError } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { emitEvent } from "../realtime";
import { dayKey } from "../lib/dates";

const router = Router();
router.use(authRequired);

const entrySchema = z.object({
  weightKg: z.number().min(20).max(400),
  day: z.string().optional(),
});

// GET /api/weight — entries oldest→newest, plus a little summary
router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const entries = await WeightEntry.find({ user: req.userId }).sort({ day: 1 });
    const user = await User.findById(req.userId);
    const latest = entries.length ? entries[entries.length - 1].weightKg : user?.weightKg || 0;
    const first = entries.length ? entries[0].weightKg : latest;
    res.json({
      entries,
      latest,
      change: Math.round((latest - first) * 10) / 10,
      goalWeightKg: user?.goalWeightKg || 0,
    });
  })
);

// POST /api/weight — log (or overwrite) a day's weight; sync profile to latest
router.post(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const body = entrySchema.parse(req.body);
    const day = body.day || dayKey();
    const entry = await WeightEntry.findOneAndUpdate(
      { user: req.userId, day },
      { $set: { weightKg: body.weightKg } },
      { new: true, upsert: true }
    );
    // Keep the profile weight in sync with the most recent entry.
    const latest = await WeightEntry.find({ user: req.userId }).sort({ day: -1 }).limit(1);
    if (latest[0] && latest[0].day === day) {
      await User.findByIdAndUpdate(req.userId, { weightKg: body.weightKg });
    }
    emitEvent("weight:updated", { entry: entry?.toJSON() });
    res.status(201).json({ entry });
  })
);

router.delete(
  "/:id",
  wrap(async (req: AuthRequest, res) => {
    const entry = await WeightEntry.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!entry) throw new HttpError(404, "Entry not found.");
    res.status(204).end();
  })
);

export default router;
