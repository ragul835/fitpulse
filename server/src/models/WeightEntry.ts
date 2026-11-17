import { Schema, model } from "mongoose";

// A logged body-weight measurement (one per day; re-logging a day overwrites it).
const weightSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true }, // "2026-11-17"
    weightKg: { type: Number, required: true, min: 20, max: 400 },
  },
  { timestamps: true }
);

weightSchema.index({ user: 1, day: 1 }, { unique: true });
weightSchema.set("toJSON", { virtuals: true });

export const WeightEntry = model("WeightEntry", weightSchema);
