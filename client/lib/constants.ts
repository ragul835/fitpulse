import type { WorkoutType } from "./types";

export const WORKOUT_TYPES: WorkoutType[] = ["Run", "Walk", "Cycle", "Strength", "Yoga", "HIIT", "Swim"];
export const WORKOUT_FILTERS: string[] = ["All", ...WORKOUT_TYPES];
export const INTENSITIES = ["Low", "Moderate", "High"] as const;

// Rough calories/min by type, used to pre-fill the estimate as the user types.
export const CAL_PER_MIN: Record<WorkoutType, number> = {
  Run: 11,
  Walk: 4,
  Cycle: 9,
  Strength: 7,
  Yoga: 3.5,
  HIIT: 13,
  Swim: 10,
};

export const DISTANCE_TYPES: WorkoutType[] = ["Run", "Walk", "Cycle", "Swim"];
