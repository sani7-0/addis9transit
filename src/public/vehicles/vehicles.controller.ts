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
import { PublicVehiclesService } from "./vehicles.service";
import { FindRouteVehiclesDto } from "./dto/find-route-vehicles.dto";

@Controller("public")
@ApiTags("public")
export class PublicVehiclesController {
  constructor(private readonly publicVehiclesService: PublicVehiclesService) {}

  @Get("vehicles")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all active vehicles" })
  @ApiResponse({
    status: 200,
    description: "All active vehicles including simulated",
    type: Object,
  })
  async findAllVehicles() {
    return this.publicVehiclesService.findAllVehicles();
  }

  @Get("routes/:route_id/vehicles")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get vehicles on a route" })
  @ApiResponse({
    status: 200,
    description: "Active vehicles on route",
    type: Object,
  })
  @ApiParam({ name: "route_id", description: "Route ID" })
  @ApiQuery({
    name: "direction_id",
    required: false,
    description: "Filter by direction (0 or 1)",
  })
  async findRouteVehicles(
    @Param("route_id") routeId: string,
    @Query() query: FindRouteVehiclesDto,
  ) {
    query.route_id = routeId;
    return this.publicVehiclesService.findRouteVehicles(query);
  }
}
