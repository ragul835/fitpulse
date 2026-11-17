import { Schema, model } from "mongoose";

export const WORKOUT_TYPES = ["Run", "Walk", "Cycle", "Strength", "Yoga", "HIIT", "Swim"] as const;

const workoutSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: WORKOUT_TYPES, required: true },
    title: { type: String, required: true },
    durationMin: { type: Number, required: true, min: 1 },
    calories: { type: Number, required: true, min: 0 },
    distanceKm: { type: Number, default: 0, min: 0 },
    intensity: { type: String, enum: ["Low", "Moderate", "High"], default: "Moderate" },
    notes: { type: String, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

workoutSchema.set("toJSON", { virtuals: true });

export const Workout = model("Workout", workoutSchema);
