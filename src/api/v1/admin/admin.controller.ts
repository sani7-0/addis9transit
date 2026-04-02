import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { Public } from "../../../common/decorators/public.decorator";
import { User } from "../../../common/decorators/user.decorator";

import { AdminService } from "./admin.service";
import {
  RegisterBusDto,
  CreateGpsDeviceDto,
  CreateApiKeyDto,
  AdminAssignTripDto,
} from "./dto/admin.dto";

@Controller("api/v1/admin")
@ApiTags("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Admin login" })
  @ApiResponse({ status: 200, description: "Login successful", type: Object })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: { email: string; password: string },
  ): Promise<{ access_token: string; user: any }> {
    const admin = await this.adminService.validateAdmin(
      body.email,
      body.password,
    );

    if (!admin) {
      return { access_token: "", user: null };
    }

    const token = this.adminService.generateToken(admin);

    return {
      access_token: token,
      user: {
        user_id: admin.user_id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
      },
    };
  }

  @Get("buses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all buses" })
  @ApiResponse({ status: 200, description: "List of buses", type: Object })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getBuses(@User() user, @Query() query: any) {
    return this.adminService.getBuses(query);
  }

  @Post("buses")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new bus" })
  @ApiResponse({
    status: 201,
    description: "Bus registered successfully",
    type: Object,
  })
  @ApiResponse({ status: 400, description: "Invalid bus data" })
  async registerBus(@User() user, @Body() dto: RegisterBusDto) {
    return this.adminService.registerBus(dto, user.sub);
  }

  @Get("devices")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all GPS devices" })
  @ApiResponse({
    status: 200,
    description: "List of GPS devices",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getGpsDevices(@User() user, @Query() query: any) {
    return this.adminService.getGpsDevices(query);
  }

  @Post("devices")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new GPS device" })
  @ApiResponse({
    status: 201,
    description: "Device created successfully",
    type: Object,
  })
  @ApiResponse({ status: 400, description: "Invalid device data" })
  async createGpsDevice(@User() user, @Body() dto: CreateGpsDeviceDto) {
    return this.adminService.createGpsDevice(dto, user.sub);
  }

  @Get("api-keys")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all API keys" })
  @ApiResponse({ status: 200, description: "List of API keys", type: Object })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getApiKeys(@User() user, @Query() query: any) {
    return this.adminService.getApiKeys(query);
  }

  @Post("api-keys")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new API key" })
  @ApiResponse({
    status: 201,
    description: "API key created successfully",
    type: Object,
  })
  @ApiResponse({ status: 400, description: "Invalid key data" })
  async createApiKey(@User() user, @Body() dto: CreateApiKeyDto) {
    return this.adminService.createApiKey(dto, user.sub);
  }

  @Post("assignments")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Assign a bus to a trip" })
  @ApiResponse({
    status: 201,
    description: "Assignment created successfully",
    type: Object,
  })
  @ApiResponse({ status: 400, description: "Invalid assignment data" })
  async assignTrip(@User() user, @Body() dto: AdminAssignTripDto) {
    return this.adminService.assignTrip(dto, user.sub);
  }

  @Get("assignments")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get active vehicle assignments" })
  @ApiResponse({
    status: 200,
    description: "List of assignments",
    type: Object,
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getAssignments(@User() user, @Query() query: any) {
    return this.adminService.getAssignments(query);
  }

  @Get("dashboard-stats")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Get dashboard statistics" })
  @ApiResponse({ status: 200, description: "Dashboard stats", type: Object })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get("stop-heatmap")
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: "Get commuter heatmap data" })
  @ApiResponse({ status: 200, description: "Heatmap data", type: Object })
  async getStopHeatmap() {
    return this.adminService.getStopHeatmap();
  }
}
