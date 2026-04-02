import { registerAs } from "@nestjs/config";

export const RedisConfig = registerAs("redis", () => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  db: parseInt(process.env.REDIS_DB || "0", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  clusterEnabled: process.env.REDIS_CLUSTER_ENABLED === "true",
  nodes: [
    {
      host: process.env.REDIS_CLUSTER_NODE_1_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
    {
      host: process.env.REDIS_CLUSTER_NODE_2_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
    {
      host: process.env.REDIS_CLUSTER_NODE_3_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
    {
      host: process.env.REDIS_CLUSTER_NODE_4_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
    {
      host: process.env.REDIS_CLUSTER_NODE_5_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
    {
      host: process.env.REDIS_CLUSTER_NODE_6_HOST,
      port: parseInt(process.env.REDIS_CLUSTER_PORT || "6379", 10),
    },
  ].filter((node) => node.host),
}));
