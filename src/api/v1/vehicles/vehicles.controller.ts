import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from "@nestjs/swagger";

import { ApiKeyGuard } from "../../../common/guards/api-key.guard";
import { Device, ApiKey } from "../../../common/decorators/device.decorator";

import { VehiclesService } from "./vehicles.service";
import { UpdateVehiclePositionDto } from "./dto/update-vehicle-position.dto";
import { AssignTripDto } from "./dto/assign-trip.dto";
import { VehicleStatusDto } from "./dto/vehicle-status.dto";

@Controller("api/v1/vehicles")
@ApiTags("vehicles")
@UseGuards(ApiKeyGuard)
@ApiHeader({
  name: "X-API-Key",
  description: "API key for device authentication",
})
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post("position")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Update vehicle GPS position" })
  @ApiResponse({
    status: 201,
    description: "Position updated successfully",
    type: Object,
  })
  @ApiResponse({ status: 400, description: "Invalid position data" })
  async updatePosition(
    @Device() device,
    @ApiKey() apiKey,
    @Body() dto: UpdateVehiclePositionDto,
  ) {
    return this.vehiclesService.updatePosition(device.device_id, dto);
  }

  @Post("assign-trip")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Assign vehicle to a trip" })
  @ApiResponse({
    status: 201,
    description: "Trip assigned successfully",
    type: Object,
  })
  @ApiResponse({ status: 404, description: "Trip not found" })
  async assignTrip(
    @Device() device,
    @ApiKey() apiKey,
    @Body() dto: AssignTripDto,
  ) {
    return this.vehiclesService.assignTrip(device.device_id, dto);
  }

  @Post("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update vehicle status" })
  @ApiResponse({
    status: 200,
    description: "Status updated successfully",
    type: Object,
  })
  @ApiResponse({ status: 404, description: "Device not found" })
  async updateStatus(
    @Device() device,
    @ApiKey() apiKey,
    @Body() dto: VehicleStatusDto,
  ) {
    return this.vehiclesService.updateStatus(device.device_id, dto);
  }
}
