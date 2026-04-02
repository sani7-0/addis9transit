import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CacheInterceptor } from "@nestjs/cache-manager";

import {
  HealthService,
  OverallHealth,
  DatabaseHealth,
  RedisHealth,
  GtfsHealth,
  VehicleHealth,
} from "./health.service";

@Controller("health")
@ApiTags("system")
@UseInterceptors(CacheInterceptor)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Overall health check" })
  @ApiResponse({
    status: 200,
    description: "System health status",
    type: Object,
  })
  async check(): Promise<OverallHealth> {
    return this.healthService.checkAll();
  }

  @Get("database")
  @ApiOperation({ summary: "Database health check" })
  @ApiResponse({ status: 200, description: "Database status", type: Object })
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get("redis")
  @ApiOperation({ summary: "Redis health check" })
  @ApiResponse({ status: 200, description: "Redis status", type: Object })
  async checkRedis() {
    return this.healthService.checkRedis();
  }

  @Get("gtfs")
  @ApiOperation({ summary: "GTFS health check" })
  @ApiResponse({ status: 200, description: "GTFS status", type: Object })
  async checkGtfs() {
    return this.healthService.checkGtfs();
  }

  @Get("vehicles")
  @ApiOperation({ summary: "Vehicles health check" })
  @ApiResponse({ status: 200, description: "Vehicles status", type: Object })
  async checkVehicles() {
    return this.healthService.checkVehicles();
  }
}
