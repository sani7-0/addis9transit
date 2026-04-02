import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";

import { Route } from "../../entities/route.entity";
import { Stop } from "../../entities/stop.entity";
import { StopTime } from "../../entities/stop-time.entity";
import { Trip } from "../../entities/trip.entity";
import { Calendar } from "../../entities/calendar.entity";

import { FindRoutesDto } from "./dto/find-routes.dto";
import { FindRouteStopsDto } from "./dto/find-route-stops.dto";
import { FindRouteScheduleDto } from "./dto/find-route-schedule.dto";

import { CACHE_KEYS } from "../../common/constants/cache-keys.constant";

export interface RouteWithTrips extends Route {
  trips: Trip[];
}

export interface StopWithSequence extends Stop {
  stop_sequence: number;
  arrival_time?: string;
  departure_time?: string;
}

export interface ScheduleWithStops extends Trip {
  stop_times: StopWithSequence[];
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @InjectRepository(Stop)
    private stopsRepository: Repository<Stop>,
    @InjectRepository(StopTime)
    private stopTimesRepository: Repository<StopTime>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    dto: FindRoutesDto,
  ): Promise<{ routes: Route[]; total: number }> {
    const cacheKey = CACHE_KEYS.ROUTES_ALL;
    const cached = await this.cacheManager.get<{
      routes: Route[];
      total: number;
    }>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for routes list`);
      return {
        routes: cached.routes.slice(
          dto.offset || 0,
          (dto.offset || 0) + (dto.limit || 50),
        ),
        total: cached.total,
      };
    }

    const queryBuilder = this.routesRepository.createQueryBuilder("route");

    if (dto.search) {
      queryBuilder.andWhere(
        "(route.route_long_name ILIKE :search OR route.route_short_name ILIKE :search)",
        { search: `%${dto.search}%` },
      );
    }

    if (dto.route_type) {
      queryBuilder.andWhere("route.route_type = :route_type", {
        route_type: dto.route_type,
      });
    }

    if (dto.agency_id) {
      queryBuilder.andWhere("route.agency_id = :agency_id", {
        agency_id: dto.agency_id,
      });
    }

    if (dto.is_active !== undefined) {
      queryBuilder.andWhere("route.is_active = :is_active", {
        is_active: dto.is_active,
      });
    }

    queryBuilder
      .orderBy("route.route_long_name", "ASC")
      .take(dto.limit || 50)
      .skip(dto.offset || 0);

    const [routes, total] = await queryBuilder.getManyAndCount();

    // Define unique colors for routes
    const ROUTE_COLORS = [
      'E53935', // Red
      '1E88E5', // Blue  
      '43A047', // Green
      'FB8C00', // Orange
      '8E24AA', // Purple
      '00ACC1', // Cyan
      'FFB300', // Amber
      '6D4C41', // Brown
      '546E7A', // Blue Grey
      'D81B60', // Pink
      '3949AB', // Indigo
      '00897B', // Teal
      '7CB342', // Light Green
      'F4511E', // Deep Orange
      '5E35B1', // Deep Purple
      '039BE5', // Light Blue
    ];

    // Assign unique colors to routes
    const routesWithColors = routes.map((route, index) => {
      if (!route.route_color) {
        route.route_color = ROUTE_COLORS[index % ROUTE_COLORS.length];
      }
      return route;
    });

    await this.cacheManager.set(
      cacheKey,
      { routes: routesWithColors, total },
      this.configService.get<number>("CACHE_TTL_ROUTE", 300),
    );

    return { routes: routesWithColors, total };
  }

  async findOne(routeId: string): Promise<RouteWithTrips> {
    const cacheKey = CACHE_KEYS.ROUTE(routeId);
    const cached = await this.cacheManager.get<RouteWithTrips>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for route ${routeId}`);
      return cached;
    }

    const route = await this.routesRepository.findOne({
      where: { route_id: routeId },
      relations: ["agency"],
    });

    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    const trips = await this.tripsRepository.find({
      where: { route_id: routeId, is_active: true },
      order: { direction_id: "ASC" },
    });

    // Assign a unique color based on route_id hash if no color exists
    const ROUTE_COLORS = [
      'E53935', '1E88E5', '43A047', 'FB8C00', '8E24AA', '00ACC1', 
      'FFB300', '6D4C41', '546E7A', 'D81B60', '3949AB', '00897B',
    ];
    
    if (!route.route_color) {
      const hash = route.route_id.split('').reduce((a, b) => {
        return a + b.charCodeAt(0);
      }, 0);
      route.route_color = ROUTE_COLORS[hash % ROUTE_COLORS.length];
    }

    const result = { ...route, trips };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.get<number>("CACHE_TTL_ROUTE", 3600),
    );

    return result;
  }

  async findStops(
    dto: FindRouteStopsDto,
  ): Promise<{ route_id: string; direction_id?: number; stops: Stop[] }> {
    const cacheKey = CACHE_KEYS.ROUTE_STOPS(dto.route_id, dto.direction_id);
    const cached = await this.cacheManager.get<{
      route_id: string;
      direction_id?: number;
      stops: Stop[];
    }>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for route ${dto.route_id} stops`);
      return cached;
    }

    const route = await this.routesRepository.findOne({
      where: { route_id: dto.route_id, is_active: true },
    });

    if (!route) {
      throw new NotFoundException(`Route with ID ${dto.route_id} not found`);
    }

    let stops: Stop[];

    if (dto.direction_id !== undefined) {
      const trip = await this.tripsRepository.findOne({
        where: {
          route_id: dto.route_id,
          direction_id: dto.direction_id,
          is_active: true,
        },
      });

      if (!trip) {
        throw new NotFoundException(
          `No trips found for route ${dto.route_id} in direction ${dto.direction_id}`,
        );
      }

      const stopTimes = await this.stopTimesRepository
        .createQueryBuilder("st")
        .innerJoin("st.stop", "stop")
        .where("st.trip_id = :trip_id", { trip_id: trip.trip_id })
        .orderBy("st.stop_sequence", "ASC")
        .getMany();

      stops = stopTimes.map((st) => ({
        ...st.stop,
        stop_sequence: st.stop_sequence,
        arrival_time: st.arrival_time,
        departure_time: st.departure_time,
      })) as StopWithSequence[];
    } else {
      // Get all stop times for this route (without distinct and orderBy to avoid PostgreSQL error)
      const stopTimes = await this.stopTimesRepository
        .createQueryBuilder("st")
        .innerJoin("st.stop", "stop")
        .where(
          "EXISTS (SELECT 1 FROM trips t WHERE t.trip_id = st.trip_id AND t.route_id = :route_id)",
          {
            route_id: dto.route_id,
          },
        )
        .getMany();

      const uniqueStopIds = [...new Set(stopTimes.map((st) => st.stop_id))];
      stops = await this.stopsRepository.findBy({ stop_id: In(uniqueStopIds) });
      
      // Sort by stop_name
      stops.sort((a, b) => (a.stop_name || '').localeCompare(b.stop_name || ''));
    }

    const result = {
      route_id: dto.route_id,
      direction_id: dto.direction_id,
      stops,
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.get<number>("CACHE_TTL_STOP", 3600),
    );

    return result;
  }

  async findSchedule(dto: FindRouteScheduleDto): Promise<ScheduleWithStops[]> {
    const today = new Date().toISOString().split("T")[0];
    const date = dto.date || today;
    const cacheKey = CACHE_KEYS.ROUTE_SCHEDULE(
      dto.route_id,
      date,
      dto.direction_id,
    );
    const cached = await this.cacheManager.get<ScheduleWithStops[]>(cacheKey);

    if (cached) {
      this.logger.debug(
        `Cache hit for route ${dto.route_id} schedule on ${date}`,
      );
      return cached;
    }

    const route = await this.routesRepository.findOne({
      where: { route_id: dto.route_id, is_active: true },
    });

    if (!route) {
      throw new NotFoundException(`Route with ID ${dto.route_id} not found`);
    }

    const queryBuilder = this.tripsRepository
      .createQueryBuilder("trip")
      .innerJoin("trip.service", "service")
      .where("trip.route_id = :route_id", { route_id: dto.route_id })
      .andWhere("trip.is_active = :is_active", { is_active: true })
      .andWhere("service.start_date <= :date", { date })
      .andWhere("service.end_date >= :date", { date });

    const dayOfWeek = new Date(date).getDay();
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    queryBuilder.andWhere(`service.${dayMap[dayOfWeek]} = :day_of_week`, {
      day_of_week: true,
    });

    if (dto.direction_id !== undefined) {
      queryBuilder.andWhere("trip.direction_id = :direction_id", {
        direction_id: dto.direction_id,
      });
    }

    const trips = await queryBuilder
      .orderBy("trip.direction_id", "ASC")
      .getMany();

    if (trips.length === 0) {
      return [];
    }

    const result: ScheduleWithStops[] = [];

    for (const trip of trips) {
      const stopTimes = await this.stopTimesRepository
        .createQueryBuilder("st")
        .innerJoin("st.stop", "stop")
        .where("st.trip_id = :trip_id", { trip_id: trip.trip_id })
        .orderBy("st.stop_sequence", "ASC")
        .getMany();

      result.push({
        ...trip,
        stop_times: stopTimes.map((st) => ({
          ...st.stop,
          stop_sequence: st.stop_sequence,
          arrival_time: st.arrival_time,
          departure_time: st.departure_time,
        })) as StopWithSequence[],
      });
    }

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.get<number>("CACHE_TTL_SCHEDULE", 300),
    );

    return result;
  }

  async findRouteShape(routeId: string): Promise<any> {
    const cacheKey = `route_shape_${routeId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    // Define unique colors for routes
    const ROUTE_COLORS = [
      'E53935', '1E88E5', '43A047', 'FB8C00', '8E24AA', '00ACC1', 
      'FFB300', '6D4C41', '546E7A', 'D81B60', '3949AB', '00897B',
    ];

    const hash = routeId.split('').reduce((a, b) => {
      return a + b.charCodeAt(0);
    }, 0);
    const defaultColor = ROUTE_COLORS[hash % ROUTE_COLORS.length];

    try {
      const route = await this.routesRepository.findOne({
        where: { route_id: routeId },
      });

      if (!route) {
        return {
          route_id: routeId,
          route_color: defaultColor,
          route_text_color: "ffffff",
          route_short_name: "",
          route_long_name: "",
          shapes: [],
        };
      }

      const trip = await this.tripsRepository.findOne({
        where: { route_id: routeId },
        order: { direction_id: "ASC" },
      });

      if (!trip || !trip.shape_id) {
        return {
          route_id: routeId,
          route_color: route.route_color || defaultColor,
          route_text_color: route.route_text_color || 'FFFFFF',
          route_short_name: route.route_short_name,
          route_long_name: route.route_long_name,
          shapes: [],
        };
      }

      const shapes = await this.dataSource.query(
        `SELECT shape_pt_lat, shape_pt_lon, shape_pt_sequence 
         FROM shapes 
         WHERE shape_id = $1 
         ORDER BY shape_pt_sequence ASC`,
        [trip.shape_id]
      );

      const result = {
        route_id: routeId,
        route_color: route.route_color || defaultColor,
        route_text_color: route.route_text_color || 'FFFFFF',
        route_short_name: route.route_short_name,
        route_long_name: route.route_long_name,
        shape_id: trip.shape_id,
        shapes: shapes.map((s: any) => ({
          lat: parseFloat(s.shape_pt_lat),
          lon: parseFloat(s.shape_pt_lon),
          sequence: s.shape_pt_sequence,
        })),
      };

      await this.cacheManager.set(cacheKey, result, 3600);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching route shape for ${routeId}`, error);
      return {
        route_id: routeId,
        route_color: defaultColor,
        route_text_color: "ffffff",
        route_short_name: "",
        route_long_name: "",
        shapes: [],
      };
    }
  }
}
