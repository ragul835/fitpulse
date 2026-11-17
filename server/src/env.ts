import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 4002),
  jwtSecret: process.env.JWT_SECRET || "fitpulse-dev-secret",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27018/fitpulse",
  clientUrl: process.env.CLIENT_URL || "*",
};
