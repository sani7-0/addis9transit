import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { RoutesService, RouteWithTrips } from "./routes.service";
import { FindRoutesDto } from "./dto/find-routes.dto";
import { FindRouteStopsDto } from "./dto/find-route-stops.dto";
import { FindRouteScheduleDto } from "./dto/find-route-schedule.dto";

@Controller("public/routes")
@ApiTags("public")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all routes" })
  @ApiResponse({ status: 200, description: "List of routes", type: [Object] })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAll(@Query() query: FindRoutesDto) {
    return this.routesService.findAll(query);
  }

  @Get(":route_id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get route details" })
  @ApiResponse({ status: 200, description: "Route with trips", type: Object })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "route_id", description: "Route ID" })
  async findOne(@Param("route_id") routeId: string): Promise<RouteWithTrips> {
    return this.routesService.findOne(routeId);
  }

  @Get(":route_id/stops")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get stops for a route" })
  @ApiResponse({
    status: 200,
    description: "Stops for the route",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "route_id", description: "Route ID" })
  @ApiQuery({
    name: "direction_id",
    required: false,
    description: "Filter by direction (0 or 1)",
  })
  async findStops(
    @Param("route_id") routeId: string,
    @Query() query: FindRouteStopsDto,
  ) {
    query.route_id = routeId;
    return this.routesService.findStops(query);
  }

  @Get(":route_id/schedule")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get schedule for a route" })
  @ApiResponse({
    status: 200,
    description: "Schedule with stop times",
    type: [Object],
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "route_id", description: "Route ID" })
  @ApiQuery({
    name: "direction_id",
    required: false,
    description: "Filter by direction (0 or 1)",
  })
  @ApiQuery({
    name: "date",
    required: false,
    description: "Date in YYYY-MM-DD format",
  })
  async findSchedule(
    @Param("route_id") routeId: string,
    @Query() query: FindRouteScheduleDto,
  ) {
    query.route_id = routeId;
    return this.routesService.findSchedule(query);
  }

  @Get(":route_id/shape")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get route shape for map" })
  @ApiResponse({
    status: 200,
    description: "Route shape coordinates",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "route_id", description: "Route ID" })
  async findShape(@Param("route_id") routeId: string) {
    return this.routesService.findRouteShape(routeId);
  }
}
