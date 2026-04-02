import { registerAs } from "@nestjs/config";

export const CacheConfig = registerAs("cache", () => ({
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || "300", 10),
  routeTTL: parseInt(process.env.CACHE_TTL_ROUTE || "3600", 10),
  stopTTL: parseInt(process.env.CACHE_TTL_STOP || "3600", 10),
  scheduleTTL: parseInt(process.env.CACHE_TTL_SCHEDULE || "300", 10),
  etaTTL: parseInt(process.env.CACHE_TTL_ETA || "30", 10),
  vehicleLiveTTL: parseInt(process.env.CACHE_TTL_VEHICLE_LIVE || "10", 10),
}));
