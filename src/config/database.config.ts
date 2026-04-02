import { registerAs } from "@nestjs/config";

export const DatabaseConfig = registerAs("database", () => ({
  type: process.env.DATABASE_TYPE || "postgres",
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: process.env.DATABASE_SYNCHRONIZE === "true",
  logging: process.env.DATABASE_LOGGING === "true",
  ssl: process.env.DATABASE_SSL === "true",
  readReplicaHosts: process.env.DATABASE_READ_REPLICA_HOSTS?.split(",") || [],
}));
