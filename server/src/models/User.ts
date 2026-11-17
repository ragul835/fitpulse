import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarColor: { type: String, default: "#22c55e" },
    // Profile
    age: { type: Number, default: 28 },
    heightCm: { type: Number, default: 175 },
    weightKg: { type: Number, default: 72 },
    goalWeightKg: { type: Number, default: 68 },
    // Daily targets
    dailyStepGoal: { type: Number, default: 10000 },
    dailyCalorieGoal: { type: Number, default: 600 },
    dailyActiveMinGoal: { type: Number, default: 45 },
    dailyWaterMl: { type: Number, default: 2500 },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = model("User", userSchema);
