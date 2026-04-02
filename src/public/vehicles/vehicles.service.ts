import { Injectable, Logger, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";

import { Bus } from "../../entities/bus.entity";
import { VehiclePosition } from "../../entities/vehicle-position.entity";
import { VehicleAssignment } from "../../entities/vehicle-assignment.entity";

import { FindRouteVehiclesDto } from "./dto/find-route-vehicles.dto";
import { CACHE_KEYS } from "../../common/constants/cache-keys.constant";
import { VehicleSimulationService } from "../../api/v1/vehicles/vehicle-simulation.service";

export interface ActiveVehicle {
  bus_id: string;
  bus_number: string;
  license_plate: string;
  device_id: string;
  trip_id: string;
  route_id: string;
  route_short_name?: string;
  route_color?: string;
  direction_id: number;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  passengers_onboard: number;
  last_seen_at: string;
  assignment_time: string;
  connectivity_status: "online" | "recently_online" | "offline";
  is_simulated?: boolean;
}

@Injectable()
export class PublicVehiclesService {
  private readonly logger = new Logger(PublicVehiclesService.name);

  constructor(
    @InjectRepository(Bus)
    private busesRepository: Repository<Bus>,
    @InjectRepository(VehiclePosition)
    private vehiclePositionsRepository: Repository<VehiclePosition>,
    @InjectRepository(VehicleAssignment)
    private vehicleAssignmentsRepository: Repository<VehicleAssignment>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    @Inject(forwardRef(() => VehicleSimulationService))
    private simulationService: VehicleSimulationService,
  ) {}

  async findRouteVehicles(dto: FindRouteVehiclesDto): Promise<{
    route_id: string;
    direction_id?: number;
    vehicles: ActiveVehicle[];
  }> {
    const cacheKey = CACHE_KEYS.ROUTE_VEHICLES(dto.route_id, dto.direction_id);
    const cached = await this.cacheManager.get<{
      route_id: string;
      direction_id?: number;
      vehicles: ActiveVehicle[];
    }>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for route ${dto.route_id} vehicles`);
      return cached;
    }

    const queryBuilder = this.vehicleAssignmentsRepository
      .createQueryBuilder("va")
      .innerJoinAndSelect("va.bus", "bus")
      .innerJoinAndSelect("va.device", "vd")
      .where("va.route_id = :route_id", { route_id: dto.route_id })
      .andWhere("va.status = :status", { status: "active" })
      .andWhere("bus.is_active = :isActive", { isActive: true })
      .andWhere("vd.is_active = :isActive", { isActive: true });

    if (dto.direction_id !== undefined) {
      queryBuilder.andWhere("va.direction_id = :direction_id", {
        direction_id: dto.direction_id,
      });
    }

    const assignments = await queryBuilder.getMany();

    // Get latest positions for each device
    const vehicles: ActiveVehicle[] = [];
    for (const assignment of assignments) {
      const position = await this.vehiclePositionsRepository.findOne({
        where: { device_id: assignment.device_id },
        order: { received_at: "DESC" },
      });

      if (!position) continue;

      const now = new Date();
      const lastSeen = new Date(position.received_at);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;

      let connectivityStatus: "online" | "recently_online" | "offline";
      if (diffMinutes <= 5) {
        connectivityStatus = "online";
      } else if (diffMinutes <= 30) {
        connectivityStatus = "recently_online";
      } else {
        connectivityStatus = "offline";
      }

      vehicles.push({
        bus_id: assignment.bus.bus_id,
        bus_number: assignment.bus.bus_number,
        license_plate: assignment.bus.license_plate || "",
        device_id: assignment.device.device_id,
        trip_id: assignment.trip_id || "",
        route_id: assignment.route_id,
        direction_id: assignment.direction_id || 0,
        latitude: position.latitude,
        longitude: position.longitude,
        heading: position.heading || 0,
        speed: position.speed || 0,
        passengers_onboard: position.passengers_onboard,
        last_seen_at: position.received_at.toISOString(),
        assignment_time: assignment.assigned_at.toISOString(),
        connectivity_status: connectivityStatus,
      });
    }

    const result = {
      route_id: dto.route_id,
      direction_id: dto.direction_id,
      vehicles,
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.get<number>("CACHE_TTL_VEHICLE_LIVE", 10),
    );

    return result;
  }

  async findAllVehicles(): Promise<{ vehicles: ActiveVehicle[] }> {
    const simulatedVehicles = this.simulationService.getVehiclePositions();

    const vehicles: ActiveVehicle[] = simulatedVehicles.map((v) => ({
      bus_id: v.vehicle_id,
      bus_number: v.vehicle_label,
      license_plate: v.vehicle_id,
      device_id: v.vehicle_id,
      trip_id: v.trip_id,
      route_id: v.route_id,
      route_short_name: v.route_short_name,
      route_color: v.route_color,
      direction_id: v.direction_id,
      latitude: v.latitude,
      longitude: v.longitude,
      heading: v.heading,
      speed: v.speed,
      passengers_onboard: v.passengers_onboard,
      last_seen_at: v.timestamp,
      assignment_time: v.timestamp,
      connectivity_status: "online" as const,
      is_simulated: true,
    }));

    return { vehicles };
  }
}
