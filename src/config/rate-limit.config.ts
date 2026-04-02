import { registerAs } from "@nestjs/config";

export const RateLimitConfig = registerAs("rateLimit", () => ({
  enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
}));
