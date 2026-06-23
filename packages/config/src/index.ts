export const APP_NAME = "ShipFlow AI";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
} as const;
