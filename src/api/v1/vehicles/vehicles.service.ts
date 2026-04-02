import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";

import { Bus } from "../../../entities/bus.entity";
import { GpsDevice } from "../../../entities/gps-device.entity";
import { VehiclePosition } from "../../../entities/vehicle-position.entity";
import { VehicleAssignment } from "../../../entities/vehicle-assignment.entity";
import { GpsValidationEvent } from "../../../entities/gps-validation-event.entity";
import { Trip } from "../../../entities/trip.entity";

import { UpdateVehiclePositionDto } from "./dto/update-vehicle-position.dto";
import { AssignTripDto } from "./dto/assign-trip.dto";
import { VehicleStatusDto } from "./dto/vehicle-status.dto";

import { CACHE_KEYS } from "../../../common/constants/cache-keys.constant";

export interface VehiclePositionResult {
  vehicle_id: string;
  device_id: string;
  bus_id: string;
  trip_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  passengers_onboard: number;
  recorded_at: string;
}

interface CachedPosition {
  latitude: number;
  longitude: number;
  recorded_at: Date;
}

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);
  private readonly lastPositions: Map<string, CachedPosition> = new Map();

  constructor(
    @InjectRepository(Bus)
    private busesRepository: Repository<Bus>,
    @InjectRepository(GpsDevice)
    private gpsDevicesRepository: Repository<GpsDevice>,
    @InjectRepository(VehiclePosition)
    private vehiclePositionsRepository: Repository<VehiclePosition>,
    @InjectRepository(VehicleAssignment)
    private vehicleAssignmentsRepository: Repository<VehicleAssignment>,
    @InjectRepository(GpsValidationEvent)
    private gpsValidationEventsRepository: Repository<GpsValidationEvent>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async updatePosition(
    deviceId: string,
    dto: UpdateVehiclePositionDto,
  ): Promise<VehiclePositionResult> {
    const device = await this.gpsDevicesRepository.findOne({
      where: { device_id: deviceId, is_active: true },
      relations: ["bus"],
    });

    if (!device) {
      this.logger.warn(`Invalid or inactive device: ${deviceId}`);
      throw new UnauthorizedException("Device not found or inactive");
    }

    const bus = device.bus;
    if (!bus) {
      this.logger.warn(`Device ${deviceId} not assigned to a bus`);
      throw new BadRequestException("Device not assigned to a bus");
    }

    if (!bus.is_active) {
      this.logger.warn(`Inactive bus attempted update: ${bus.bus_id}`);
      throw new UnauthorizedException("Bus is inactive");
    }

    const validation = await this.validatePosition(device.device_id, dto);

    if (!validation.isValid) {
      this.logger.warn(
        `Invalid position for device ${deviceId}: ${validation.reason}`,
      );
      throw new BadRequestException(validation.reason);
    }

    const now = new Date();
    const recordedAt = new Date(dto.timestamp);

    const position = this.vehiclePositionsRepository.create({
      device_id: deviceId,
      bus_id: bus.bus_id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude,
      heading: dto.heading,
      speed: dto.speed,
      accuracy: dto.accuracy,
      passengers_onboard: dto.passengers_onboard || 0,
      recorded_at: recordedAt,
      received_at: now,
      is_valid: true,
    });

    await this.vehiclePositionsRepository.save(position);

    await this.gpsDevicesRepository.update(deviceId, {
      last_online_at: now,
    });

    const activeAssignment = await this.vehicleAssignmentsRepository.findOne({
      where: { bus_id: bus.bus_id, status: "active" },
    });

    if (activeAssignment) {
      await this.vehiclePositionsRepository.update(position.id, {
        trip_id: activeAssignment.trip_id,
        route_id: activeAssignment.route_id,
      });
    }

    await this.cacheManager.set(
      CACHE_KEYS.VEHICLE_LIVE(bus.bus_id),
      {
        bus_id: bus.bus_id,
        bus_number: bus.bus_number,
        latitude: dto.latitude,
        longitude: dto.longitude,
        heading: dto.heading,
        speed: dto.speed,
        passengers_onboard: dto.passengers_onboard || 0,
        last_seen_at: now.toISOString(),
        trip_id: activeAssignment?.trip_id || "",
        route_id: activeAssignment?.route_id || "",
      },
      this.configService.get<number>("CACHE_TTL_VEHICLE_LIVE", 10),
    );

    this.logger.log(
      `Position updated: device=${deviceId}, bus=${bus.bus_number}, lat=${dto.latitude}, lon=${dto.longitude}`,
    );

    return {
      vehicle_id: bus.bus_id,
      device_id: deviceId,
      bus_id: bus.bus_id,
      trip_id: activeAssignment?.trip_id || "",
      route_id: activeAssignment?.route_id || "",
      latitude: dto.latitude,
      longitude: dto.longitude,
      heading: dto.heading || 0,
      speed: dto.speed || 0,
      passengers_onboard: dto.passengers_onboard || 0,
      recorded_at: now.toISOString(),
    };
  }

  async assignTrip(
    deviceId: string,
    dto: AssignTripDto,
  ): Promise<{ assignment_id: string; message: string }> {
    const device = await this.gpsDevicesRepository.findOne({
      where: { device_id: deviceId, is_active: true },
      relations: ["bus"],
    });

    if (!device) {
      throw new NotFoundException("Device not found or inactive");
    }

    const bus = device.bus;
    if (!bus) {
      throw new BadRequestException("Device not assigned to a bus");
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
        busId: bus.bus_id,
        status: "active",
      })
      .execute();

    const assignment = this.vehicleAssignmentsRepository.create({
      bus_id: bus.bus_id,
      device_id: deviceId,
      trip_id: dto.trip_id,
      route_id: dto.route_id || trip.route_id,
      direction_id: dto.direction_id || trip.direction_id,
      start_stop_id: dto.start_stop_id,
      end_stop_id: dto.end_stop_id,
      assigned_by: "api_key",
      notes: dto.notes,
    });

    await this.vehicleAssignmentsRepository.save(assignment);

    this.logger.log(
      `Trip assigned: device=${deviceId}, trip=${dto.trip_id}, bus=${bus.bus_number}`,
    );

    return {
      assignment_id: assignment.assignment_id,
      message: "Trip assigned successfully",
    };
  }

  async updateStatus(
    deviceId: string,
    dto: VehicleStatusDto,
  ): Promise<{ message: string }> {
    const device = await this.gpsDevicesRepository.findOne({
      where: { device_id: deviceId, is_active: true },
      relations: ["bus"],
    });

    if (!device) {
      throw new NotFoundException("Device not found or inactive");
    }

    if (!device.bus) {
      throw new BadRequestException("Device not assigned to a bus");
    }

    this.logger.log(
      `Status updated: device=${deviceId}, bus=${device.bus.bus_number}, status=${dto.status}`,
    );

    return { message: "Status updated successfully" };
  }

  private async validatePosition(
    deviceId: string,
    dto: UpdateVehiclePositionDto,
  ): Promise<{ isValid: boolean; reason?: string }> {
    const lastPos = this.lastPositions.get(deviceId);

    if (!lastPos) {
      this.lastPositions.set(deviceId, {
        latitude: dto.latitude,
        longitude: dto.longitude,
        recorded_at: new Date(dto.timestamp),
      });
      return { isValid: true };
    }

    const minLatitude = this.configService.get<number>('GPS_MIN_LATITUDE', 3.4);
    const maxLatitude = this.configService.get<number>('GPS_MAX_LATITUDE', 14.9);
    const minLongitude = this.configService.get<number>('GPS_MIN_LONGITUDE', 33.0);
    const maxLongitude = this.configService.get<number>('GPS_MAX_LONGITUDE', 48.0);
    const timeSkewTolerance = this.configService.get<number>('GPS_TIME_SKEW_TOLERANCE', 300);
    
    if (
      dto.latitude < minLatitude ||
      dto.latitude > maxLatitude ||
      dto.longitude < minLongitude ||
      dto.longitude > maxLongitude
    ) {
      await this.logValidationEvent(
        deviceId,
        dto,
        "rejected",
        "Coordinates outside Ethiopia bounds",
      );
      return { isValid: false, reason: "Coordinates outside service area" };
    }

    const timeDiff =
      (new Date(dto.timestamp).getTime() - lastPos.recorded_at.getTime()) / 1000;

    if (Math.abs(timeDiff) > timeSkewTolerance) {
      await this.logValidationEvent(
        deviceId,
        dto,
        "rejected",
        `Time skew: ${timeDiff}s`,
      );
      return { isValid: false, reason: "Timestamp outside acceptable range" };
    }

    if (timeDiff < 1) {
      return { isValid: false, reason: "Updates too frequent" };
    }

    const distance = this.haversineDistance(
      { lat: lastPos.latitude, lon: lastPos.longitude },
      { lat: dto.latitude, lon: dto.longitude },
    );

    const movementThreshold = this.configService.get<number>('GPS_MIN_MOVEMENT_THRESHOLD', 0.001);
    const maxSpeed = this.configService.get<number>('GPS_MAX_SPEED_KMH', 120);
    const maxDistancePerSecond = this.configService.get<number>('GPS_MAX_DISTANCE_PER_SECOND', 0.15);

    if (distance < movementThreshold) {
      this.lastPositions.set(deviceId, {
        latitude: dto.latitude,
        longitude: dto.longitude,
        recorded_at: new Date(dto.timestamp),
      });
      return { isValid: true };
    }

    const speed = distance / (timeDiff / 3600);

    if (speed > maxSpeed) {
      await this.logValidationEvent(
        deviceId,
        dto,
        "rejected",
        `Improbable speed: ${speed.toFixed(1)} km/h over ${distance.toFixed(2)}km in ${timeDiff}s`,
      );
      return { isValid: false, reason: "Improbable speed detected" };
    }

    const distancePerSecond = distance / timeDiff;
    if (distancePerSecond > maxDistancePerSecond) {
      await this.logValidationEvent(
        deviceId,
        dto,
        "rejected",
        `Impossible jump: ${distance.toFixed(2)}km in ${timeDiff}s`,
      );
      return { isValid: false, reason: "Impossible GPS jump detected" };
    }

      this.lastPositions.set(deviceId, {
        latitude: dto.latitude,
        longitude: dto.longitude,
        recorded_at: new Date(dto.timestamp),
      });

    return { isValid: true };
  }

  private async logValidationEvent(
    deviceId: string,
    dto: UpdateVehiclePositionDto,
    result: "accepted" | "rejected" | "flagged",
    reason?: string,
  ): Promise<void> {
    const lastPos = this.lastPositions.get(deviceId);
    let distance, speed, timeDiff;

    if (lastPos) {
      distance = this.haversineDistance(
        { lat: lastPos.latitude, lon: lastPos.longitude },
        { lat: dto.latitude, lon: dto.longitude },
      );
      timeDiff =
        (new Date(dto.timestamp).getTime() - lastPos.recorded_at.getTime()) /
        1000;
      speed = timeDiff > 0 ? distance / (timeDiff / 3600) : 0;
    }

    await this.gpsValidationEventsRepository.insert({
      device_id: deviceId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      recorded_at: new Date(dto.timestamp),
      validation_result: result,
      rejection_reason: reason,
      speed_kmh: speed,
      distance_km: distance,
      time_diff_seconds: timeDiff,
    });
  }

  private haversineDistance(
    coord1: { lat: number; lon: number },
    coord2: { lat: number; lon: number },
  ): number {
    const R = 6371;
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lon - coord1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) *
        Math.cos(this.toRad(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private loadLastPositions(): void {
    this.dataSource
      .query(
        `
      SELECT DISTINCT ON (device_id) 
        device_id, latitude, longitude, recorded_at 
      FROM vehicle_positions 
      WHERE recorded_at > NOW() - INTERVAL '1 hour' 
      ORDER BY device_id, recorded_at DESC 
      LIMIT 1000
    `,
      )
      .then((result) => {
        result.forEach((row: any) => {
          this.lastPositions.set(row.device_id, {
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            recorded_at: row.recorded_at,
          });
        });
        this.logger.debug(
          `Loaded ${result.length} last positions from database`,
        );
      })
      .catch((error) => {
        this.logger.error("Failed to load last positions", error);
      });
  }
}
