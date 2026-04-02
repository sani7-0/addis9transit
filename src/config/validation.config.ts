import { registerAs } from "@nestjs/config";

export const ValidationConfig = registerAs("validation", () => ({
  gpsEnabled: process.env.GPS_VALIDATION_ENABLED !== "false",
  ethiopiaBounds: {
    minLatitude: parseFloat(process.env.GPS_MIN_LATITUDE || "3.4"),
    maxLatitude: parseFloat(process.env.GPS_MAX_LATITUDE || "14.9"),
    minLongitude: parseFloat(process.env.GPS_MIN_LONGITUDE || "33.0"),
    maxLongitude: parseFloat(process.env.GPS_MAX_LONGITUDE || "48.0"),
  },
  speedLimits: {
    maxSpeed: parseInt(process.env.GPS_MAX_SPEED_KMH || "120", 10),
    warningSpeed: parseInt(process.env.GPS_WARNING_SPEED_KMH || "80", 10),
  },
  distanceTime: {
    maxDistancePerSecond: parseFloat(
      process.env.GPS_MAX_DISTANCE_PER_SECOND || "0.15",
    ),
    warningDistancePerSecond: parseFloat(
      process.env.GPS_WARNING_DISTANCE_PER_SECOND || "0.08",
    ),
  },
  timeSkew: {
    maxToleranceSeconds: parseInt(
      process.env.GPS_TIME_SKEW_TOLERANCE || "300",
      10,
    ),
  },
  movement: {
    minMovementThreshold: parseFloat(
      process.env.GPS_MIN_MOVEMENT_THRESHOLD || "0.001",
    ),
  },
  acceleration: {
    maxKmhPerSecond: parseFloat(
      process.env.GPS_MAX_ACCELERATION_KMH_PER_SECOND || "5",
    ),
  },
  heading: {
    maxChangePerSecond: parseFloat(
      process.env.GPS_MAX_HEADING_CHANGE_PER_SECOND || "180",
    ),
  },
}));
