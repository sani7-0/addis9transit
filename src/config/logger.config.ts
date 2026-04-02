import { registerAs } from "@nestjs/config";

export const AppLoggerConfig = registerAs("logger", () => ({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.LOG_FORMAT || "json",
  pretty: process.env.LOG_PRETTY === "true",
  filePath: process.env.LOG_FILE_PATH || "./logs",
  maxSize: parseInt(process.env.LOG_MAX_SIZE || "10485760", 10),
  maxFiles: parseInt(process.env.LOG_MAX_FILES || "30", 10),
}));
