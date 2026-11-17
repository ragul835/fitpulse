export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  dailyStepGoal: number;
  dailyCalorieGoal: number;
  dailyActiveMinGoal: number;
  dailyWaterMl: number;
}

export type WorkoutType = "Run" | "Walk" | "Cycle" | "Strength" | "Yoga" | "HIIT" | "Swim";

export interface Workout {
  _id: string;
  type: WorkoutType;
  title: string;
  durationMin: number;
  calories: number;
  distanceKm: number;
  intensity: "Low" | "Moderate" | "High";
  notes?: string;
  date: string;
}

export interface Ring {
  value: number;
  goal: number;
}

export interface DayPoint {
  day: string;
  label?: string;
  steps: number;
  calories: number;
  activeMinutes: number;
  distanceKm: number;
  waterMl?: number;
}

export interface Dashboard {
  rings: { steps: Ring; calories: Ring; activeMinutes: Ring };
  water: Ring;
  week: DayPoint[];
  weekTotals: { steps: number; calories: number; activeMinutes: number; distanceKm: number };
  streak: number;
  totalWorkouts: number;
  recentWorkouts: Workout[];
}

export interface WeightEntry {
  _id: string;
  day: string;
  weightKg: number;
}

export interface WeightSummary {
  entries: WeightEntry[];
  latest: number;
  change: number;
  goalWeightKg: number;
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  value: number;
  target: number;
  unlocked: boolean;
  progress: number;
}

export interface Achievements {
  badges: Badge[];
  unlockedCount: number;
  total: number;
  stats: {
    totalWorkouts: number;
    totalDistance: number;
    totalCalories: number;
    totalMinutes: number;
    longestStreak: number;
    bestSteps: number;
  };
}

export interface LeaderRow {
  id: string;
  name: string;
  avatarColor: string;
  steps: number;
  activeMinutes: number;
  isMe: boolean;
  rank: number;
}

export interface Goal {
  _id: string;
  title: string;
  metric: "steps" | "calories" | "workouts" | "distance" | "activeMinutes";
  target: number;
  period: "daily" | "weekly";
  active: boolean;
  current: number;
}
