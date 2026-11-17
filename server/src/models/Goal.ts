import { Schema, model } from "mongoose";

export const GOAL_METRICS = ["steps", "calories", "workouts", "distance", "activeMinutes"] as const;

const goalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    metric: { type: String, enum: GOAL_METRICS, required: true },
    target: { type: Number, required: true, min: 1 },
    period: { type: String, enum: ["daily", "weekly"], default: "weekly" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

goalSchema.set("toJSON", { virtuals: true });

export const Goal = model("Goal", goalSchema);
