import { Injectable, Logger, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";

export interface HealthCheck {
  status: "healthy" | "unhealthy";
  latency_ms: number;
}

export interface DatabaseHealth extends HealthCheck {
  connection_count: number;
}

export interface RedisHealth extends HealthCheck {
  connected: boolean;
}

export interface GtfsHealth {
  status: "healthy" | "unhealthy";
  last_import?: string;
  version?: string;
  routes?: number;
  stops?: number;
  trips?: number;
}

export interface VehicleHealth {
  status: "healthy" | "unhealthy";
  total_vehicles: number;
  online_vehicles: number;
  offline_vehicles: number;
}

export interface OverallHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: DatabaseHealth;
    redis: RedisHealth;
    gtfs?: GtfsHealth;
    vehicles?: VehicleHealth;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: Date = new Date();
  private readonly logger: Logger = new Logger(HealthService.name);

  constructor(
  @InjectDataSource()
  private readonly dataSource: DataSource,

  @Inject(CACHE_MANAGER)
  private readonly cacheManager: Cache,

  private readonly configService: ConfigService,
) {}

  private readonly version: string = process.env.npm_package_version || "1.0.0";

  async checkAll(): Promise<OverallHealth> {
    const now = Date.now();
    const uptime = Math.floor((now - this.startTime.getTime()) / 1000);

    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const gtfsHealth = await this.checkGtfs();
    const vehicleHealth = await this.checkVehicles();

    const overallStatus = this.calculateOverallStatus([
      dbHealth.status,
      redisHealth.status,
      gtfsHealth.status,
      vehicleHealth.status,
    ]);

    return {
      status: overallStatus,
      timestamp: new Date(now).toISOString(),
      uptime,
      version: this.version,
      environment: this.configService.get<string>("NODE_ENV", "development"),
      services: {
        database: dbHealth,
        redis: redisHealth,
        gtfs: gtfsHealth,
        vehicles: vehicleHealth,
      },
    };
  }

  async checkDatabase(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: "unhealthy",
          latency_ms: Date.now() - startTime,
          connection_count: 0,
        };
      }

      const result = await this.dataSource.query("SELECT 1");

      const connectionCountResult = await this.dataSource.query(
        "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'",
      );
      const connectionCount = parseInt(connectionCountResult[0].count, 10);

      this.logger.debug(
        `Database health check passed: ${Date.now() - startTime}ms`,
      );

      return {
        status: "healthy",
        latency_ms: Date.now() - startTime,
        connection_count: connectionCount,
      };
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${error.message}`,
        error.stack,
      );
      return {
        status: "unhealthy",
        latency_ms: Date.now() - startTime,
        connection_count: 0,
      };
    }
  }

  async checkRedis(): Promise<RedisHealth> {
    const startTime = Date.now();
    try {
      const cache: any = this.cacheManager && typeof this.cacheManager.set === 'function' ? this.cacheManager : {
        set: async () => {},
        get: async () => undefined
      }
      await cache.set("health:check", "ok", 5);
      const result = await cache.get("health:check");

      if (result === "ok") {
        this.logger.debug(
          `Redis health check passed: ${Date.now() - startTime}ms`,
        );
        return {
          status: "healthy",
          latency_ms: Date.now() - startTime,
          connected: true,
        };
      }

      return {
        status: "unhealthy",
        latency_ms: Date.now() - startTime,
        connected: false,
      };
    } catch (error) {
      this.logger.error(
        `Redis health check failed: ${error.message}`,
        error.stack,
      );
      return {
        status: "unhealthy",
        latency_ms: Date.now() - startTime,
        connected: false,
      };
    }
  }

  async checkGtfs(): Promise<GtfsHealth> {
    const startTime = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        return { status: "unhealthy" };
      }

      const routeCount = await this.dataSource.query(
        "SELECT COUNT(*) FROM routes",
      );
      const stopCount = await this.dataSource.query(
        "SELECT COUNT(*) FROM stops",
      );
      const tripCount = await this.dataSource.query(
        "SELECT COUNT(*) FROM trips",
      );
      const importHistory = await this.dataSource.query(
        "SELECT completed_at, version FROM import_history WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1",
      );

      const health: GtfsHealth = {
        status: "healthy",
        routes: parseInt(routeCount[0].count, 10),
        stops: parseInt(stopCount[0].count, 10),
        trips: parseInt(tripCount[0].count, 10),
      };

      if (importHistory.length > 0) {
        health.last_import = importHistory[0].completed_at;
        health.version = importHistory[0].version;
      }

      this.logger.debug(
        `GTFS health check passed: ${Date.now() - startTime}ms`,
      );

      return health;
    } catch (error) {
      this.logger.error(
        `GTFS health check failed: ${error.message}`,
        error.stack,
      );
      return { status: "unhealthy" };
    }
  }

  async checkVehicles(): Promise<VehicleHealth> {
    const startTime = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: "unhealthy",
          total_vehicles: 0,
          online_vehicles: 0,
          offline_vehicles: 0,
        };
      }

      const totalResult = await this.dataSource.query(
        "SELECT COUNT(*) FROM buses WHERE is_active = true",
      );
      const onlineResult = await this.dataSource.query(
        "SELECT COUNT(DISTINCT bus_id) FROM vehicle_assignments WHERE status = 'active' AND created_at > NOW() - INTERVAL '30 minutes'",
      );

      const health: VehicleHealth = {
        status: "healthy",
        total_vehicles: parseInt(totalResult[0].count, 10),
        online_vehicles: parseInt(onlineResult[0].count, 10),
        offline_vehicles:
          parseInt(totalResult[0].count, 10) -
          parseInt(onlineResult[0].count, 10),
      };

      this.logger.debug(
        `Vehicles health check passed: ${Date.now() - startTime}ms`,
      );

      return health;
    } catch (error) {
      this.logger.error(
        `Vehicles health check failed: ${error.message}`,
        error.stack,
      );
      return {
        status: "unhealthy",
        total_vehicles: 0,
        online_vehicles: 0,
        offline_vehicles: 0,
      };
    }
  }

  private calculateOverallStatus(
    statuses: string[],
  ): "healthy" | "degraded" | "unhealthy" {
    const unhealthyCount = statuses.filter((s) => s === "unhealthy").length;
    const totalStatuses = statuses.length;

    if (unhealthyCount === totalStatuses) {
      return "unhealthy";
    } else if (unhealthyCount > 0) {
      return "degraded";
    }

    return "healthy";
  }
}
