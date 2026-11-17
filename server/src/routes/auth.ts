import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { wrap, HttpError } from "../lib/http";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const AV_COLORS = ["#22c55e", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const profileSchema = z.object({
  name: z.string().min(2).optional(),
  age: z.number().int().min(10).max(120).optional(),
  heightCm: z.number().min(80).max(260).optional(),
  weightKg: z.number().min(25).max(400).optional(),
  goalWeightKg: z.number().min(25).max(400).optional(),
  dailyStepGoal: z.number().int().min(1000).optional(),
  dailyCalorieGoal: z.number().int().min(100).optional(),
  dailyActiveMinGoal: z.number().int().min(5).optional(),
  dailyWaterMl: z.number().int().min(250).optional(),
});

router.post(
  "/register",
  wrap(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) throw new HttpError(409, "That email is already registered.");
    const passwordHash = await bcrypt.hash(body.password, 10);
    const count = await User.countDocuments();
    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash,
      avatarColor: AV_COLORS[count % AV_COLORS.length],
    });
    res.status(201).json({ token: signToken({ sub: user.id }), user: user.toJSON() });
  })
);

router.post(
  "/login",
  wrap(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password.");
    }
    res.json({ token: signToken({ sub: user.id }), user: user.toJSON() });
  })
);

router.get(
  "/me",
  authRequired,
  wrap(async (req: AuthRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(404, "User not found.");
    res.json({ user: user.toJSON() });
  })
);

router.patch(
  "/me",
  authRequired,
  wrap(async (req: AuthRequest, res) => {
    const body = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, body, { new: true });
    if (!user) throw new HttpError(404, "User not found.");
    res.json({ user: user.toJSON() });
  })
);

export default router;
