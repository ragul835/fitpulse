import { Router } from "express";
import { User } from "../models/User";
import { ActivityLog } from "../models/ActivityLog";
import { wrap } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { lastNDays } from "../lib/dates";

const router = Router();
router.use(authRequired);

// GET /api/leaderboard — rank all users by this week's steps
router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const weekKeys = lastNDays(7);
    const users = await User.find();
    const logs = await ActivityLog.find({ day: { $in: weekKeys } });

    const steps = new Map<string, number>();
    const active = new Map<string, number>();
    for (const l of logs) {
      const uid = String(l.user);
      steps.set(uid, (steps.get(uid) || 0) + (l.steps || 0));
      active.set(uid, (active.get(uid) || 0) + (l.activeMinutes || 0));
    }

    const rows = users
      .map((u) => ({
        id: u.id,
        name: u.name,
        avatarColor: u.avatarColor,
        steps: steps.get(u.id) || 0,
        activeMinutes: active.get(u.id) || 0,
        isMe: u.id === req.userId,
      }))
      .sort((a, b) => b.steps - a.steps)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const me = rows.find((r) => r.isMe);
    res.json({ rows, myRank: me?.rank || null, total: rows.length });
  })
);

export default router;
