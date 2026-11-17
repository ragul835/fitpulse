import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { User } from "./models/User";
import { Workout, WORKOUT_TYPES } from "./models/Workout";
import { ActivityLog } from "./models/ActivityLog";
import { Goal } from "./models/Goal";
import { WeightEntry } from "./models/WeightEntry";
import { dayKey } from "./lib/dates";

type WType = (typeof WORKOUT_TYPES)[number];

const WORKOUT_BLUEPRINTS: Record<WType, { titles: string[]; calPerMin: number; kmPerMin: number }> = {
  Run: { titles: ["Morning Run", "Tempo Run", "Easy 5K", "Interval Run", "River Loop"], calPerMin: 11, kmPerMin: 0.17 },
  Walk: { titles: ["Evening Walk", "Lunch Walk", "Park Stroll", "Dog Walk"], calPerMin: 4, kmPerMin: 0.09 },
  Cycle: { titles: ["City Ride", "Hill Climb", "Commute Ride", "Weekend Spin"], calPerMin: 9, kmPerMin: 0.35 },
  Strength: { titles: ["Upper Body", "Leg Day", "Full Body", "Push/Pull", "Core & Arms"], calPerMin: 7, kmPerMin: 0 },
  Yoga: { titles: ["Vinyasa Flow", "Morning Yoga", "Stretch & Mobility", "Restorative"], calPerMin: 3.5, kmPerMin: 0 },
  HIIT: { titles: ["HIIT Blast", "Tabata", "Circuit Burn", "Bodyweight HIIT"], calPerMin: 13, kmPerMin: 0 },
  Swim: { titles: ["Lap Swim", "Open Water", "Freestyle Sets"], calPerMin: 10, kmPerMin: 0.03 },
};

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function seedUser(name: string, email: string, color: string, days: number) {
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    avatarColor: color,
    age: rand(24, 38),
    heightCm: rand(165, 185),
    weightKg: rand(62, 85),
    goalWeightKg: rand(58, 75),
    dailyStepGoal: 10000,
    dailyCalorieGoal: 600,
    dailyActiveMinGoal: 45,
  });

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const dow = d.getDay();

    // ~70% of days have a workout (fewer on some weekdays)
    const hasWorkout = Math.random() < (dow === 0 || dow === 6 ? 0.8 : 0.65);
    let calories = 0;
    let activeMinutes = 0;
    let distanceKm = 0;

    if (hasWorkout && i > 0) {
      const sessions = Math.random() < 0.18 ? 2 : 1;
      for (let s = 0; s < sessions; s++) {
        const type = pick(WORKOUT_TYPES) as WType;
        const bp = WORKOUT_BLUEPRINTS[type];
        const durationMin = rand(20, 65);
        const cal = Math.round(durationMin * bp.calPerMin * (0.85 + Math.random() * 0.3));
        const km = Math.round(durationMin * bp.kmPerMin * (0.85 + Math.random() * 0.3) * 100) / 100;
        const when = new Date(d);
        when.setHours(rand(6, 20), rand(0, 59), 0, 0);
        await Workout.create({
          user: user._id,
          type,
          title: pick(bp.titles),
          durationMin,
          calories: cal,
          distanceKm: km,
          intensity: pick(["Low", "Moderate", "High"]),
          notes: "",
          date: when,
        });
        calories += cal;
        activeMinutes += durationMin;
        distanceKm += km;
      }
    }

    // Today is only partially complete (nice for the progress rings)
    const dayFactor = i === 0 ? 0.55 : 1;
    const baseSteps = rand(4000, 9000);
    const workoutSteps = Math.round(distanceKm * 1312);
    const steps = Math.round((baseSteps + workoutSteps) * dayFactor);

    await ActivityLog.create({
      user: user._id,
      day: key,
      steps,
      calories: Math.round(calories * dayFactor),
      activeMinutes: Math.round(activeMinutes * dayFactor),
      distanceKm: Math.round(distanceKm * dayFactor * 100) / 100,
      restingHr: rand(52, 68),
      sleepHours: Math.round((6 + Math.random() * 2.5) * 10) / 10,
      waterMl: Math.round(rand(1200, 3000) * dayFactor),
    });
  }

  // Body-weight history trending down to the current profile weight (so the
  // latest entry matches "Body stats"). Logged roughly every 3 days.
  const endWeight = user.weightKg as number;
  const startWeight = endWeight + rand(4, 8);
  for (let i = days - 1; i >= 0; i--) {
    if (i % 3 !== 0 && i !== 0) continue;
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const progress = (days - 1 - i) / Math.max(1, days - 1);
    const noise = i === 0 ? 0 : (Math.random() - 0.5) * 0.7;
    const w = startWeight + (endWeight - startWeight) * progress + noise;
    await WeightEntry.create({ user: user._id, day: dayKey(d), weightKg: Math.round(w * 10) / 10 });
  }

  await Goal.create([
    { user: user._id, title: "Walk 70k steps this week", metric: "steps", target: 70000, period: "weekly" },
    { user: user._id, title: "Burn 3,000 kcal weekly", metric: "calories", target: 3000, period: "weekly" },
    { user: user._id, title: "5 workouts a week", metric: "workouts", target: 5, period: "weekly" },
    { user: user._id, title: "Run 20 km this week", metric: "distance", target: 20, period: "weekly" },
  ]);

  return user;
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log("🌱 Seeding FitPulse…");

  await Promise.all([
    User.deleteMany({}),
    Workout.deleteMany({}),
    ActivityLog.deleteMany({}),
    Goal.deleteMany({}),
    WeightEntry.deleteMany({}),
  ]);

  await seedUser("Alex Rivera", "alex@fitpulse.dev", "#22c55e", 45);
  await seedUser("Jordan Blake", "jordan@fitpulse.dev", "#06b6d4", 30);
  // Extra athletes so the leaderboard has a real ranking.
  await seedUser("Maya Chen", "maya@fitpulse.dev", "#8b5cf6", 21);
  await seedUser("Diego Santos", "diego@fitpulse.dev", "#f59e0b", 21);
  await seedUser("Priya Nair", "priya@fitpulse.dev", "#ec4899", 21);

  console.log("✅ Seed complete.");
  console.log("\nSample accounts (password for all: password123):");
  console.log("  • alex@fitpulse.dev    (45 days of history)");
  console.log("  • jordan@fitpulse.dev  (30 days of history)");
  console.log("  • maya@ / diego@ / priya@fitpulse.dev  (leaderboard rivals)");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
