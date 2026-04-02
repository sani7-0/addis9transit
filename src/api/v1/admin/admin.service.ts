import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";

import { Bus } from "../../../entities/bus.entity";
import { GpsDevice } from "../../../entities/gps-device.entity";
import { ApiKey } from "../../../entities/api-key.entity";
import { VehicleAssignment } from "../../../entities/vehicle-assignment.entity";
import { Trip } from "../../../entities/trip.entity";
import { Agency } from "../../../entities/agency.entity";

import { RegisterBusDto } from "./dto/admin.dto";
import { CreateGpsDeviceDto } from "./dto/admin.dto";
import { CreateApiKeyDto } from "./dto/admin.dto";
import { AdminAssignTripDto } from "./dto/admin.dto";

import { JwtService } from "../../../auth/jwt.service";
import * as crypto from "crypto";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Bus)
    private busesRepository: Repository<Bus>,
    @InjectRepository(GpsDevice)
    private gpsDevicesRepository: Repository<GpsDevice>,
    @InjectRepository(ApiKey)
    private apiKeysRepository: Repository<ApiKey>,
    @InjectRepository(VehicleAssignment)
    private vehicleAssignmentsRepository: Repository<VehicleAssignment>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async registerBus(
    dto: RegisterBusDto,
    adminId: string,
  ): Promise<ApiResponse<{ bus_id: string }>> {
    const agency = await this.agencyRepository.findOne({
      where: { agency_id: dto.agency_id },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${dto.agency_id} not found`);
    }

    const existingBus = await this.busesRepository.findOne({
      where: [
        { bus_number: dto.bus_number },
        { license_plate: dto.license_plate || "" },
      ],
    });

    if (existingBus) {
      throw new BadRequestException(
        "Bus number or license plate already exists",
      );
    }

    const bus = this.busesRepository.create({
      bus_number: dto.bus_number,
      license_plate: dto.license_plate,
      bus_model: dto.bus_model,
      capacity: dto.capacity || 50,
      year: dto.year,
      agency_id: dto.agency_id,
      commission_date: dto.commission_date,
      notes: dto.notes,
    });

    await this.busesRepository.save(bus);

    this.logger.log(`Bus registered: ${dto.bus_number} by ${adminId}`);

    return {
      success: true,
      message: "Bus registered successfully",
      data: { bus_id: bus.bus_id },
    };
  }

  async createGpsDevice(
    dto: CreateGpsDeviceDto,
    adminId: string,
  ): Promise<ApiResponse<{ device_id: string }>> {
    const bus = await this.busesRepository.findOne({
      where: { bus_id: dto.bus_id, is_active: true },
    });

    if (!bus) {
      throw new NotFoundException("Bus not found or inactive");
    }

    const existingDevice = await this.gpsDevicesRepository.findOne({
      where: { bus_id: dto.bus_id, is_active: true },
    });

    if (existingDevice) {
      throw new BadRequestException("Bus already has an active GPS device");
    }

    const device = this.gpsDevicesRepository.create({
      bus_id: dto.bus_id,
      device_name: dto.device_name || `Device for ${bus.bus_number}`,
      device_type: dto.device_type || "tracker",
      device_model: dto.device_model,
      serial_number: dto.serial_number,
      firmware_version: dto.firmware_version,
      installation_date: dto.installation_date,
    });

    await this.gpsDevicesRepository.save(device);

    this.logger.log(
      `GPS device created: ${device.device_id} for bus ${bus.bus_number}`,
    );

    return {
      success: true,
      message: "GPS device created successfully",
      data: { device_id: device.device_id },
    };
  }

  async createApiKey(
    dto: CreateApiKeyDto,
    adminId: string,
  ): Promise<ApiResponse<{ api_key: string }>> {
    const device = await this.gpsDevicesRepository.findOne({
      where: { device_id: dto.device_id, is_active: true },
      relations: ["bus"],
    });

    if (!device) {
      throw new NotFoundException("Device not found or inactive");
    }

    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.substring(0, 10);

    const keyRecord = this.apiKeysRepository.create({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      device_id: dto.device_id,
      key_name:
        dto.key_name ||
        `Key for ${device.bus?.bus_number || device.device_name}`,
      expires_at: dto.expires_at,
      created_by: adminId,
    });

    await this.apiKeysRepository.save(keyRecord);

    this.logger.log(
      `API key created for device ${dto.device_id} by ${adminId}`,
    );

    return {
      success: true,
      message: "API key created successfully",
      data: { api_key: apiKey },
    };
  }

  async assignTrip(
    dto: AdminAssignTripDto,
    adminId: string,
  ): Promise<ApiResponse<{ assignment_id: string }>> {
    const bus = await this.busesRepository.findOne({
      where: { bus_id: dto.bus_id, is_active: true },
    });

    if (!bus) {
      throw new NotFoundException("Bus not found or inactive");
    }

    const trip = await this.tripsRepository.findOne({
      where: { trip_id: dto.trip_id, is_active: true },
      relations: ["route"],
    });

    if (!trip) {
      throw new NotFoundException("Trip not found or inactive");
    }

    await this.dataSource
      .createQueryBuilder()
      .update(VehicleAssignment)
      .set({ status: "completed", unassigned_at: new Date() })
      .where("bus_id = :busId AND status = :status", {
        busId: dto.bus_id,
        status: "active",
      })
      .execute();

    const assignment = this.vehicleAssignmentsRepository.create({
      bus_id: dto.bus_id,
      trip_id: dto.trip_id,
      route_id: dto.route_id || trip.route_id,
      direction_id: dto.direction_id || trip.direction_id,
      start_stop_id: dto.start_stop_id,
      end_stop_id: dto.end_stop_id,
      assigned_by: adminId,
      notes: dto.notes,
    });

    await this.vehicleAssignmentsRepository.save(assignment);

    this.logger.log(
      `Trip assigned: bus=${bus.bus_number}, trip=${dto.trip_id} by ${adminId}`,
    );

    return {
      success: true,
      message: "Trip assigned successfully",
      data: { assignment_id: assignment.assignment_id },
    };
  }

  async getBuses(params: {
    limit?: number;
    offset?: number;
    agency_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<{ buses: Bus[]; total: number }>> {
    const queryBuilder = this.busesRepository.createQueryBuilder("bus");

    if (params.agency_id) {
      queryBuilder.andWhere("bus.agency_id = :agencyId", {
        agencyId: params.agency_id,
      });
    }

    if (params.is_active !== undefined) {
      queryBuilder.andWhere("bus.is_active = :isActive", {
        isActive: params.is_active,
      });
    }

    const [buses, total] = await queryBuilder
      .orderBy("bus.bus_number", "ASC")
      .take(params.limit || 50)
      .skip(params.offset || 0)
      .getManyAndCount();

    return {
      success: true,
      message: "Buses retrieved successfully",
      data: { buses, total },
    };
  }

  async getGpsDevices(params: {
    limit?: number;
    offset?: number;
    bus_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<{ devices: GpsDevice[]; total: number }>> {
    const queryBuilder = this.gpsDevicesRepository.createQueryBuilder("device");

    if (params.bus_id) {
      queryBuilder.andWhere("device.bus_id = :busId", { busId: params.bus_id });
    }

    if (params.is_active !== undefined) {
      queryBuilder.andWhere("device.is_active = :isActive", {
        isActive: params.is_active,
      });
    }

    const [devices, total] = await queryBuilder
      .leftJoinAndSelect("device.bus", "bus")
      .orderBy("device.created_at", "DESC")
      .take(params.limit || 50)
      .skip(params.offset || 0)
      .getManyAndCount();

    return {
      success: true,
      message: "GPS devices retrieved successfully",
      data: { devices, total },
    };
  }

  async getApiKeys(params: {
    limit?: number;
    offset?: number;
    device_id?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<{ api_keys: ApiKey[]; total: number }>> {
    const queryBuilder = this.apiKeysRepository.createQueryBuilder("key");

    if (params.device_id) {
      queryBuilder.andWhere("key.device_id = :deviceId", {
        deviceId: params.device_id,
      });
    }

    if (params.is_active !== undefined) {
      queryBuilder.andWhere("key.is_active = :isActive", {
        isActive: params.is_active,
      });
    }

    const [apiKeys, total] = await queryBuilder
      .leftJoinAndSelect("key.device", "device")
      .leftJoinAndSelect("device.bus", "bus")
      .orderBy("key.created_at", "DESC")
      .take(params.limit || 50)
      .skip(params.offset || 0)
      .getManyAndCount();

    const sanitizedKeys = apiKeys.map((key) => ({
      ...key,
      api_key_hash: undefined,
      api_key_prefix: key.api_key_prefix,
    }));

    return {
      success: true,
      message: "API keys retrieved successfully",
      data: { api_keys: sanitizedKeys, total },
    };
  }

  async getAssignments(params: {
    limit?: number;
    offset?: number;
    bus_id?: string;
    status?: string;
  }): Promise<
    ApiResponse<{ assignments: VehicleAssignment[]; total: number }>
  > {
    const queryBuilder =
      this.vehicleAssignmentsRepository.createQueryBuilder("va");

    if (params.bus_id) {
      queryBuilder.andWhere("va.bus_id = :busId", { busId: params.bus_id });
    }

    if (params.status) {
      queryBuilder.andWhere("va.status = :status", { status: params.status });
    }

    const [assignments, total] = await queryBuilder
      .leftJoinAndSelect("va.bus", "bus")
      .leftJoinAndSelect("va.device", "device")
      .leftJoinAndSelect("va.trip", "trip")
      .orderBy("va.assigned_at", "DESC")
      .take(params.limit || 50)
      .skip(params.offset || 0)
      .getManyAndCount();

    return {
      success: true,
      message: "Assignments retrieved successfully",
      data: { assignments, total },
    };
  }

  // Public methods to expose jwtService functionality
  async validateAdmin(email: string, password: string) {
    return this.jwtService.validateAdmin(email, password);
  }

  generateToken(admin: any) {
    return this.jwtService.generateToken(admin);
  }

  private generateApiKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `at_${result}`;
  }

  private hashApiKey(apiKey: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  async getDashboardStats() {
    const [routesTotal, stopsTotal, tripsTotal, busesTotal] = await Promise.all([
      this.dataSource.query("SELECT COUNT(*) FROM routes"),
      this.dataSource.query("SELECT COUNT(*) FROM stops"),
      this.dataSource.query("SELECT COUNT(*) FROM trips"),
      this.dataSource.query("SELECT COUNT(*) FROM buses"),
    ]);

    const routes = await this.dataSource.query("SELECT route_id, route_short_name, route_long_name, route_color FROM routes LIMIT 20");
    const stops = await this.dataSource.query("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops LIMIT 50");
    const agencies = await this.dataSource.query("SELECT agency_id, agency_name FROM agency");

    return {
      stats: {
        routes: parseInt(routesTotal[0]?.count || "0"),
        stops: parseInt(stopsTotal[0]?.count || "0"),
        trips: parseInt(tripsTotal[0]?.count || "0"),
        buses: parseInt(busesTotal[0]?.count || "0"),
      },
      routes,
      stops,
      agencies,
    };
  }

  async getStopHeatmap() {
    const heatmap = await this.dataSource.query(`
      SELECT 
        st.stop_id,
        s.stop_name,
        s.stop_lat,
        s.stop_lon,
        COUNT(*) as query_count
      FROM stop_times st
      JOIN stops s ON st.stop_id = s.stop_id
      GROUP BY st.stop_id, s.stop_name, s.stop_lat, s.stop_lon
      ORDER BY query_count DESC
      LIMIT 50
    `);
    return { heatmap };
  }
}
