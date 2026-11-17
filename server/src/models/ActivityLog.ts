import { Schema, model } from "mongoose";

// One document per user per calendar day (day key = YYYY-MM-DD).
const activitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true }, // "2026-11-17"
    steps: { type: Number, default: 0, min: 0 },
    calories: { type: Number, default: 0, min: 0 },
    activeMinutes: { type: Number, default: 0, min: 0 },
    distanceKm: { type: Number, default: 0, min: 0 },
    restingHr: { type: Number, default: 0, min: 0 },
    sleepHours: { type: Number, default: 0, min: 0 },
    waterMl: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, day: 1 }, { unique: true });
activitySchema.set("toJSON", { virtuals: true });

export const ActivityLog = model("ActivityLog", activitySchema);
