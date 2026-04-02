import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { interval, Subscription } from "rxjs";

import { Route } from "../../../entities/route.entity";
import { Trip } from "../../../entities/trip.entity";
import { Shape } from "../../../entities/shape.entity";
import { StopTime } from "../../../entities/stop-time.entity";
import { VehiclesGateway } from "./vehicles.gateway";

interface SimulatedVehicle {
  vehicleId: string;
  routeId: string;
  tripId: string;
  directionId: number;
  shapeId: string;
  shapePoints: Array<{ lat: number; lon: number }>;
  currentProgress: number;
  speed: number;
  heading: number;
  nextStopIndex: number;
  routeShortName: string;
  routeColor: string;
}

interface ShapePoint {
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

interface StopTimeInfo {
  stop_id: string;
  arrival_time: string;
  stop_sequence: number;
}

@Injectable()
export class VehicleSimulationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VehicleSimulationService.name);
  private simulationInterval: Subscription | null = null;
  private simulatedVehicles: Map<string, SimulatedVehicle> = new Map();
  private vehicleIdCounter = 1;

  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Shape)
    private shapesRepository: Repository<Shape>,
    @InjectRepository(StopTime)
    private stopTimesRepository: Repository<StopTime>,
    private vehiclesGateway: VehiclesGateway,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeSimulation();
    this.startSimulation();
    this.logger.log("Vehicle simulation service initialized");
  }

  async onModuleDestroy() {
    if (this.simulationInterval) {
      this.simulationInterval.unsubscribe();
    }
    this.logger.log("Vehicle simulation service stopped");
  }

  private async initializeSimulation() {
    try {
      const routes = await this.routesRepository.find({ take: 100 });
      this.logger.log(`Found ${routes.length} routes to simulate`);

      for (const route of routes) {
        await this.assignVehiclesToRoute(route);
      }
    } catch (error) {
      this.logger.error("Failed to initialize simulation", error);
    }
    this.logger.log(`Simulation initialized with ${this.simulatedVehicles.size} buses`);
  }

  private async assignVehiclesToRoute(route: Route) {
    const trips = await this.tripsRepository.find({
      where: { route_id: route.route_id },
      take: 6,
    });

    if (trips.length === 0) return;

    const direction0Trips = trips.filter(t => t.direction_id === 0);
    const direction1Trips = trips.filter(t => t.direction_id === 1);

    // Generate unique color based on route_id
    const ROUTE_COLORS = [
      'E53935', '1E88E5', '43A047', 'FB8C00', '8E24AA', '00ACC1', 
      'FFB300', '6D4C41', '546E7A', 'D81B60', '3949AB', '00897B',
    ];
    const hash = route.route_id.split('').reduce((a, b) => {
      return a + b.charCodeAt(0);
    }, 0);
    const routeColor = route.route_color || ROUTE_COLORS[hash % ROUTE_COLORS.length];

    const assignDirection = async (directionTrips: Trip[], directionId: number, count: number) => {
      if (directionTrips.length === 0) return;

      for (let i = 0; i < count; i++) {
        const trip = directionTrips[i % directionTrips.length];
        
        const shapePoints = await this.getShapePoints(trip.shape_id);
        if (shapePoints.length === 0) continue;

        const stopTimes = await this.getStopTimes(trip.trip_id);
        if (stopTimes.length === 0) continue;

        const vehicleId = `SIM-${this.vehicleIdCounter++}`;
        // Space buses along the route
        const progress = (i / count) + (Math.random() * 0.2 - 0.1);
        const normalizedProgress = Math.max(0, Math.min(1, progress));

        const vehicle: SimulatedVehicle = {
          vehicleId,
          routeId: route.route_id,
          tripId: trip.trip_id,
          directionId,
          shapeId: trip.shape_id,
          shapePoints,
          currentProgress: normalizedProgress,
          speed: 20 + Math.random() * 10,
          heading: this.calculateHeading(shapePoints, normalizedProgress),
          nextStopIndex: this.findNextStopIndex(stopTimes, normalizedProgress),
          routeShortName: route.route_short_name || route.route_id.slice(-3),
          routeColor: routeColor,
        };

        this.simulatedVehicles.set(vehicleId, vehicle);
        this.logger.debug(`Assigned vehicle ${vehicleId} to route ${route.route_short_name} direction ${directionId}`);
      }
    };

    // Assign 2 buses per direction (4 total per route)
    if (direction0Trips.length > 0) {
      await assignDirection(direction0Trips, 0, 2);
    }
    if (direction1Trips.length > 0) {
      await assignDirection(direction1Trips, 1, 2);
    }
  }

  private async getShapePoints(shapeId: string | null): Promise<Array<{ lat: number; lon: number }>> {
    if (!shapeId) return [];

    const shapes = await this.shapesRepository.find({
      where: { shape_id: shapeId },
      order: { shape_pt_sequence: "ASC" },
      take: 200,
    });

    return shapes.map((s: ShapePoint) => ({
      lat: Number(s.shape_pt_lat),
      lon: Number(s.shape_pt_lon),
    }));
  }

  private async getStopTimes(tripId: string): Promise<StopTimeInfo[]> {
    const stopTimes = await this.stopTimesRepository.find({
      where: { trip_id: tripId },
      order: { stop_sequence: "ASC" },
    });

    return stopTimes.map(st => ({
      stop_id: st.stop_id,
      arrival_time: st.arrival_time,
      stop_sequence: st.stop_sequence,
    }));
  }

  private findNextStopIndex(stopTimes: StopTimeInfo[], progress: number): number {
    const totalStops = stopTimes.length;
    const currentStopIndex = Math.floor(progress * totalStops);
    return Math.min(currentStopIndex + 1, totalStops - 1);
  }

  private calculateHeading(shapePoints: Array<{ lat: number; lon: number }>, progress: number): number {
    const totalPoints = shapePoints.length;
    const currentIndex = Math.floor(progress * (totalPoints - 1));
    const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);

    const current = shapePoints[currentIndex];
    const next = shapePoints[nextIndex];

    const lat1 = current.lat * (Math.PI / 180);
    const lat2 = next.lat * (Math.PI / 180);
    const dLon = (next.lon - current.lon) * (Math.PI / 180);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let heading = Math.atan2(y, x) * (180 / Math.PI);
    heading = (heading + 360) % 360;

    return heading;
  }

  private startSimulation() {
    const updateInterval = this.configService.get<number>("VEHICLE_SIMULATION_INTERVAL", 3000);
    
    this.simulationInterval = interval(updateInterval).subscribe(() => {
      this.updateVehiclePositions();
      this.broadcastVehiclePositions();
    });
  }

  private updateVehiclePositions() {
    const speedFactor = 0.002;

    for (const [vehicleId, vehicle] of this.simulatedVehicles) {
      vehicle.currentProgress += speedFactor * (vehicle.speed / 30);

      if (vehicle.currentProgress >= 1) {
        vehicle.currentProgress = 0;
        this.reassignVehicle(vehicle);
      }

      vehicle.heading = this.calculateHeading(vehicle.shapePoints, vehicle.currentProgress);
    }
  }

  private async reassignVehicle(vehicle: SimulatedVehicle) {
    const trips = await this.tripsRepository.find({
      where: { route_id: vehicle.routeId, direction_id: vehicle.directionId },
      take: 2,
    });

    if (trips.length > 0) {
      const newTrip = trips[Math.floor(Math.random() * trips.length)];
      vehicle.tripId = newTrip.trip_id;
      
      if (newTrip.shape_id) {
        vehicle.shapeId = newTrip.shape_id;
        vehicle.shapePoints = await this.getShapePoints(newTrip.shape_id);
      }
    }
  }

  private broadcastVehiclePositions() {
    const now = new Date();

    for (const [_, vehicle] of this.simulatedVehicles) {
      const position = this.getInterpolatedPosition(vehicle);

      const update = {
        vehicleId: vehicle.vehicleId,
        vehicle_id: vehicle.vehicleId,
        vehicle_label: vehicle.routeShortName,
        route_id: vehicle.routeId,
        route_short_name: vehicle.routeShortName,
        route_color: vehicle.routeColor,
        trip_id: vehicle.tripId,
        direction_id: vehicle.directionId,
        latitude: position.lat,
        longitude: position.lon,
        heading: vehicle.heading,
        speed: vehicle.speed,
        passengers_onboard: Math.floor(Math.random() * 30) + 10,
        timestamp: now.toISOString(),
        is_simulated: true,
      };

      this.vehiclesGateway.broadcastVehicleUpdate(update);
    }
  }

  private getInterpolatedPosition(vehicle: SimulatedVehicle): { lat: number; lon: number } {
    const { shapePoints, currentProgress } = vehicle;
    
    if (shapePoints.length === 0) {
      return { lat: 9.025, lon: 38.746 };
    }

    const totalSegments = shapePoints.length - 1;
    const exactPosition = currentProgress * totalSegments;
    const currentIndex = Math.floor(exactPosition);
    const nextIndex = Math.min(currentIndex + 1, totalSegments);
    const segmentProgress = exactPosition - currentIndex;

    const current = shapePoints[currentIndex];
    const next = shapePoints[nextIndex];

    return {
      lat: current.lat + (next.lat - current.lat) * segmentProgress,
      lon: current.lon + (next.lon - current.lon) * segmentProgress,
    };
  }

  getSimulatedVehicles(): SimulatedVehicle[] {
    return Array.from(this.simulatedVehicles.values());
  }

  getVehiclePositions(): Array<{
    vehicle_id: string;
    vehicle_label: string;
    route_id: string;
    route_short_name: string;
    route_color: string;
    trip_id: string;
    direction_id: number;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    passengers_onboard: number;
    timestamp: string;
    is_simulated: boolean;
  }> {
    const positions: Array<{
      vehicle_id: string;
      vehicle_label: string;
      route_id: string;
      route_short_name: string;
      route_color: string;
      trip_id: string;
      direction_id: number;
      latitude: number;
      longitude: number;
      heading: number;
      speed: number;
      passengers_onboard: number;
      timestamp: string;
      is_simulated: boolean;
    }> = [];
    const now = new Date();

    for (const [_, vehicle] of this.simulatedVehicles) {
      const position = this.getInterpolatedPosition(vehicle);
      positions.push({
        vehicle_id: vehicle.vehicleId,
        vehicle_label: vehicle.routeShortName,
        route_id: vehicle.routeId,
        route_short_name: vehicle.routeShortName,
        route_color: vehicle.routeColor,
        trip_id: vehicle.tripId,
        direction_id: vehicle.directionId,
        latitude: position.lat,
        longitude: position.lon,
        heading: vehicle.heading,
        speed: vehicle.speed,
        passengers_onboard: Math.floor(Math.random() * 30) + 10,
        timestamp: now.toISOString(),
        is_simulated: true,
      });
    }

    return positions;
  }
}
