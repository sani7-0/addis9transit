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
import { StopsService } from "./stops.service";
import { FindStopsDto } from "./dto/find-stops.dto";
import { FindStopScheduleDto } from "./dto/find-stop-schedule.dto";
import { FindStopEtasDto } from "./dto/find-stop-etas.dto";

@Controller("public")
@ApiTags("public")
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Get("nearby")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get nearby routes based on location" })
  @ApiResponse({
    status: 200,
    description: "Nearby stops and routes",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiQuery({ name: "lat", required: true, description: "Latitude" })
  @ApiQuery({ name: "lon", required: true, description: "Longitude" })
  @ApiQuery({ name: "radius", required: false, description: "Search radius in km (default 1.5)" })
  async findNearby(
    @Query("lat") lat: string,
    @Query("lon") lon: string,
    @Query("radius") radius?: string,
  ) {
    return this.stopsService.findNearbyRoutes(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : 1.5,
    );
  }

  @Get("stops")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all stops" })
  @ApiResponse({ status: 200, description: "List of stops", type: [Object] })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAll(@Query() query: FindStopsDto) {
    return this.stopsService.findAll(query);
  }

  @Get("stops/:stop_id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get stop details" })
  @ApiResponse({
    status: 200,
    description: "Stop with routes serving it",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "stop_id", description: "Stop ID" })
  async findOne(@Param("stop_id") stopId: string) {
    return this.stopsService.findOne(stopId);
  }

  @Get("stops/:stop_id/schedule")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get stop schedule" })
  @ApiResponse({
    status: 200,
    description: "Schedule with arrival times",
    type: [Object],
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "stop_id", description: "Stop ID" })
  @ApiQuery({
    name: "date",
    required: false,
    description: "Date in YYYY-MM-DD format",
  })
  async findSchedule(
    @Param("stop_id") stopId: string,
    @Query() query: FindStopScheduleDto,
  ) {
    query.stop_id = stopId;
    return this.stopsService.findSchedule(query);
  }

  @Get("stops/:stop_id/etas")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get ETAs for stop" })
  @ApiResponse({
    status: 200,
    description: "Estimated arrival times",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiParam({ name: "stop_id", description: "Stop ID" })
  async findEtas(
    @Param("stop_id") stopId: string,
    @Query() query: FindStopEtasDto,
  ) {
    query.stop_id = stopId;
    return this.stopsService.findEtas(query);
  }

  @Get("plan/:from_stop/:to_stop")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Plan trip between two stops" })
  @ApiResponse({
    status: 200,
    description: "Trip options between stops",
    type: Object,
  })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiParam({ name: "from_stop", description: "From Stop ID" })
  @ApiParam({ name: "to_stop", description: "To Stop ID" })
  async planTrip(
    @Param("from_stop") fromStop: string,
    @Param("to_stop") toStop: string,
  ) {
    return this.stopsService.findTrips(fromStop, toStop);
  }
}
