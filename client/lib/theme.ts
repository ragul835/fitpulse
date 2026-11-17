// FitPulse dark theme tokens (energetic indigo/cyan on deep slate).
export const colors = {
  bg: "#0a0f1a",
  bgSoft: "#0f1724",
  card: "#131c2b",
  card2: "#1a2537",
  border: "#243247",
  borderSoft: "#1c2838",
  text: "#eaf0f7",
  textDim: "#93a3b8",
  textFaint: "#64748b",
  primary: "#6366f1",
  primaryHi: "#818cf8",
  primarySoft: "rgba(99,102,241,0.15)",
  cyan: "#06b6d4",
  cyanSoft: "rgba(6,182,212,0.15)",
  violet: "#8b5cf6",
  violetSoft: "rgba(139,92,246,0.15)",
  amber: "#f59e0b",
  amberSoft: "rgba(245,158,11,0.15)",
  red: "#ef4444",
  redSoft: "rgba(239,68,68,0.15)",
  pink: "#ec4899",
};

// Per-workout-type accent colors.
export const typeColor: Record<string, string> = {
  Run: "#6366f1",
  Walk: "#84cc16",
  Cycle: "#06b6d4",
  Strength: "#f59e0b",
  Yoga: "#8b5cf6",
  HIIT: "#ef4444",
  Swim: "#3b82f6",
};

export const typeIcon: Record<string, string> = {
  Run: "🏃",
  Walk: "🚶",
  Cycle: "🚴",
  Strength: "🏋️",
  Yoga: "🧘",
  HIIT: "🔥",
  Swim: "🏊",
};

export const ringColors = {
  steps: "#6366f1",
  calories: "#f59e0b",
  activeMinutes: "#06b6d4",
};

export const radius = { sm: 10, md: 14, lg: 20 };
