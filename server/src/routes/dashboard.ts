import { Router } from "express";
import { User } from "../models/User";
import { Workout } from "../models/Workout";
import { ActivityLog } from "../models/ActivityLog";
import { wrap, HttpError } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";
import { dayKey, lastNDays, shortDay } from "../lib/dates";

const router = Router();
router.use(authRequired);

// GET /api/dashboard — today's rings, weekly series, streak, recent workouts
router.get(
  "/",
  wrap(async (req: AuthRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(404, "User not found.");

    const today = dayKey();
    const weekKeys = lastNDays(7);
    const logs = await ActivityLog.find({ user: req.userId, day: { $in: weekKeys } });
    const byDay = new Map(logs.map((l) => [l.day, l]));

    const todayLog = byDay.get(today);
    const rings = {
      steps: { value: todayLog?.steps || 0, goal: user.dailyStepGoal },
      calories: { value: todayLog?.calories || 0, goal: user.dailyCalorieGoal },
      activeMinutes: { value: todayLog?.activeMinutes || 0, goal: user.dailyActiveMinGoal },
    };
    const water = { value: todayLog?.waterMl || 0, goal: user.dailyWaterMl };

    const week = weekKeys.map((day) => {
      const l = byDay.get(day);
      return {
        day,
        label: shortDay(day),
        steps: l?.steps || 0,
        calories: l?.calories || 0,
        activeMinutes: l?.activeMinutes || 0,
        distanceKm: l?.distanceKm || 0,
      };
    });

    const weekTotals = week.reduce(
      (acc, d) => ({
        steps: acc.steps + d.steps,
        calories: acc.calories + d.calories,
        activeMinutes: acc.activeMinutes + d.activeMinutes,
        distanceKm: Math.round((acc.distanceKm + d.distanceKm) * 100) / 100,
      }),
      { steps: 0, calories: 0, activeMinutes: 0, distanceKm: 0 }
    );

    // Active-day streak (consecutive days with any active minutes). Today not
    // being done yet doesn't break the streak — we skip an inactive today.
    let streak = 0;
    const allKeysDesc = lastNDays(90).reverse(); // today first
    const allLogs = await ActivityLog.find({ user: req.userId, day: { $in: allKeysDesc } });
    const activeSet = new Set(allLogs.filter((l) => (l.activeMinutes || 0) > 0).map((l) => l.day));
    for (let idx = 0; idx < allKeysDesc.length; idx++) {
      const key = allKeysDesc[idx];
      if (activeSet.has(key)) streak += 1;
      else if (idx === 0) continue; // today not active yet — don't break
      else break;
    }

    const recentWorkouts = await Workout.find({ user: req.userId }).sort({ date: -1 }).limit(5);
    const totalWorkouts = await Workout.countDocuments({ user: req.userId });

    res.json({
      rings,
      water,
      week,
      weekTotals,
      streak,
      totalWorkouts,
      recentWorkouts,
    });
  })
);

export default router;
