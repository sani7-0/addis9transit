import { Injectable, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";

import { Stop } from "../../entities/stop.entity";
import { StopTime } from "../../entities/stop-time.entity";
import { Trip } from "../../entities/trip.entity";
import { Route } from "../../entities/route.entity";

import { FindStopsDto } from "./dto/find-stops.dto";
import { FindStopScheduleDto } from "./dto/find-stop-schedule.dto";
import { FindStopEtasDto } from "./dto/find-stop-etas.dto";

@Injectable()
export class StopsService {
  private readonly logger = new Logger(StopsService.name);

  constructor(
    @InjectRepository(Stop)
    private stopsRepository: Repository<Stop>,
    @InjectRepository(StopTime)
    private stopTimesRepository: Repository<StopTime>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async findAll(query: FindStopsDto): Promise<any[]> {
    const cacheKey = `stops_all_${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for stops list`);
      return cached;
    }

    const { limit = 100, offset = 0, search, lat, lon, radius = 5 } = query;

    let queryBuilder = this.stopsRepository
      .createQueryBuilder('stop');

    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(stop.stop_name ILIKE :search OR stop.stop_code ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (lat !== undefined && lon !== undefined) {
      queryBuilder = queryBuilder.andWhere(
        `(
          6371 * acos(
            cos(radians(:lat)) * cos(radians(stop.stop_lat)) *
            cos(radians(stop.stop_lon) - radians(:lon)) +
            sin(radians(:lat)) * sin(radians(stop.stop_lat))
          )
        ) <= :radius`,
        { lat, lon, radius }
      );
    }

    const stops = await queryBuilder
      .orderBy('stop.stop_name', 'ASC')
      .skip(offset)
      .take(limit)
      .getMany();

    await this.cacheManager.set(cacheKey, stops, 300);
    return stops;
  }

  async findOne(stopId: string): Promise<any> {
    const cacheKey = `stop_${stopId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for stop ${stopId}`);
      return cached;
    }

    const stop = await this.stopsRepository
      .createQueryBuilder('stop')
      .leftJoinAndSelect('stop.routes', 'route')
      .where('stop.stop_id = :stopId', { stopId })
      .getOne();

    if (!stop) {
      return null;
    }

    const routes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoin('st.trip', 'trip')
      .innerJoin('trip.route', 'route')
      .where('st.stop_id = :stopId', { stopId })
      .andWhere('trip.is_active = :isActive', { isActive: true })
      .andWhere('route.is_active = :isActive', { isActive: true })
      .select(['route.route_id', 'route.route_short_name', 'route.route_long_name', 'route.route_color'])
      .distinct(true)
      .getMany();

    const result = {
      ...stop,
      routes: routes.map(r => r.trip.route),
    };

    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async findEtas(dto: FindStopEtasDto): Promise<any> {
    const cacheKey = `stop_etas_${dto.stop_id}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const stopTimes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.trip', 'trip')
      .innerJoinAndSelect('trip.route', 'route')
      .where('st.stop_id = :stopId', { stopId: dto.stop_id })
      .orderBy('st.arrival_time', 'ASC')
      .limit(20)
      .getMany();

    const etas = stopTimes
      .map(st => {
        const arrivalSeconds = this.timeToSeconds(st.arrival_time);
        const etaMinutes = Math.round((arrivalSeconds - currentSeconds) / 60);
        return {
          route_id: st.trip.route_id,
          route_short_name: st.trip.route.route_short_name,
          route_long_name: st.trip.route.route_long_name,
          route_color: st.trip.route.route_color,
          direction_id: st.trip.direction_id,
          trip_headsign: st.trip.trip_headsign,
          arrival_time: st.arrival_time,
          eta_minutes: etaMinutes > 0 ? etaMinutes : 0,
          is_live: false,
        };
      })
      .filter(e => e.eta_minutes >= 0)
      .slice(0, 10);

    const result = { stop_id: dto.stop_id, computed_at: now.toISOString(), etas };
    await this.cacheManager.set(cacheKey, result, 30);
    return result;
  }

  async findSchedule(dto: FindStopScheduleDto): Promise<any[]> {
    const cacheKey = `stop_schedule_${dto.stop_id}_${dto.date || 'today'}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    
    if (cached) {
      this.logger.debug(`Cache hit for stop ${dto.stop_id} schedule`);
      return cached;
    }

    const now = new Date();
    const date = dto.date || now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const stopTimes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.trip', 'trip')
      .innerJoinAndSelect('trip.route', 'route')
      .where('st.stop_id = :stopId', { stopId: dto.stop_id })
      .orderBy('st.arrival_time', 'ASC')
      .limit(50)
      .getMany();

    // Map to schedule response format
    const result = stopTimes.map((st) => ({
      trip_id: st.trip_id,
      arrival_time: st.arrival_time,
      departure_time: st.departure_time,
      stop_id: st.stop_id,
      stop_sequence: st.stop_sequence,
      stop_headsign: st.stop_headsign,
      pickup_type: st.pickup_type,
      drop_off_type: st.drop_off_type,
      continuous_pickup: st.continuous_pickup,
      continuous_drop_off: st.continuous_drop_off,
      shape_dist_traveled: st.shape_dist_traveled,
      timepoint: st.timepoint,
      route_id: st.trip.route_id,
      route_short_name: st.trip.route.route_short_name,
      route_long_name: st.trip.route.route_long_name,
      route_color: st.trip.route.route_color,
      direction_id: st.trip.direction_id,
      trip_headsign: st.trip.trip_headsign,
    }));

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300);

    return result;
  }

  async findNearbyRoutes(lat: number, lon: number, radius: number = 1.5): Promise<any> {
    const cacheKey = `nearby_routes_${lat}_${lon}_${radius}`;
    const cached = await this.cacheManager.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    const stops = await this.stopsRepository
      .createQueryBuilder('stop')
      .where(`
        (
          6371 * acos(
            cos(radians(:lat)) * cos(radians(stop.stop_lat)) *
            cos(radians(stop.stop_lon) - radians(:lon)) +
            sin(radians(:lat)) * sin(radians(stop.stop_lat))
          )
        ) <= :radius
      `, { lat, lon, radius })
      .take(50)
      .getMany();

    if (stops.length === 0) {
      return { stops: [], routes: [] };
    }

    const stopIds = stops.map(s => s.stop_id);

    const routes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoin('st.trip', 'trip')
      .innerJoin('trip.route', 'route')
      .where('st.stop_id IN (:...stopIds)', { stopIds })
      .andWhere('trip.is_active = :isActive', { isActive: true })
      .select([
        'route.route_id',
        'route.route_short_name',
        'route.route_long_name',
        'route.route_color',
        'route.route_text_color',
      ])
      .distinct(true)
      .getRawMany();

    const stopsWithDistance = stops.map(stop => {
      const distance = this.calculateDistance(lat, lon, Number(stop.stop_lat), Number(stop.stop_lon));
      return {
        ...stop,
        distance_km: Math.round(distance * 100) / 100,
      };
    }).sort((a, b) => a.distance_km - b.distance_km);

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

    const result = {
      user_location: { lat, lon },
      stops: stopsWithDistance.slice(0, 20),
      routes: routes.map((r, index) => ({
        route_id: r.route_route_id,
        route_short_name: r.route_route_short_name,
        route_long_name: r.route_route_long_name,
        route_color: r.route_route_color || ROUTE_COLORS[index % ROUTE_COLORS.length],
        route_text_color: r.route_route_text_color || 'FFFFFF',
      })),
    };

    await this.cacheManager.set(cacheKey, result, 120);
    return result;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async findTrips(fromStopId: string, toStopId: string): Promise<any> {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const currentTimeStr = this.secondsToTime(currentSeconds);

    // Get all trips that serve FROM stop with arrival time after now
    const fromStopTimes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.trip', 'trip')
      .innerJoinAndSelect('trip.route', 'route')
      .where('st.stop_id = :fromStopId', { fromStopId })
      .andWhere('st.arrival_time > :currentTime', { currentTime: currentTimeStr })
      .orderBy('st.arrival_time', 'ASC')
      .limit(50)
      .getMany();

    // Get all trips that serve TO stop
    const toStopTimes = await this.stopTimesRepository
      .createQueryBuilder('st')
      .innerJoinAndSelect('st.trip', 'trip')
      .innerJoinAndSelect('trip.route', 'route')
      .where('st.stop_id = :toStopId', { toStopId })
      .orderBy('st.arrival_time', 'ASC')
      .limit(50)
      .getMany();

    const tripOptions: any[] = [];

    // Find direct trips (same trip serves both stops)
    for (const fromSt of fromStopTimes) {
      for (const toSt of toStopTimes) {
        if (fromSt.trip.trip_id === toSt.trip.trip_id && fromSt.stop_sequence < toSt.stop_sequence) {
          const departSeconds = this.timeToSeconds(fromSt.arrival_time);
          const arriveSeconds = this.timeToSeconds(toSt.arrival_time);
          const durationMinutes = Math.round((arriveSeconds - departSeconds) / 60);

          tripOptions.push({
            route_id: fromSt.trip.route_id,
            route_short_name: fromSt.trip.route.route_short_name,
            route_long_name: fromSt.trip.route.route_long_name,
            route_color: fromSt.trip.route.route_color,
            trip_id: fromSt.trip.trip_id,
            direction_id: fromSt.trip.direction_id,
            trip_headsign: fromSt.trip.trip_headsign,
            departTime: fromSt.arrival_time,
            arriveTime: toSt.arrival_time,
            durationMinutes,
            departSeconds,
            arriveSeconds,
            fromStopSeq: fromSt.stop_sequence,
            toStopSeq: toSt.stop_sequence,
            type: 'direct',
          });
        }
      }
    }

    // Sort by departure time
    tripOptions.sort((a, b) => a.departSeconds - b.departSeconds);

    // Get stop names
    const fromStop = await this.stopsRepository.findOne({ where: { stop_id: fromStopId } });
    const toStop = await this.stopsRepository.findOne({ where: { stop_id: toStopId } });

    // Format top 5 results
    const result = tripOptions.slice(0, 5).map((opt, idx) => ({
      id: idx + 1,
      type: 'direct',
      route_id: opt.route_id,
      route_short_name: opt.route_short_name,
      route_long_name: opt.route_long_name,
      route_color: opt.route_color || '#E53935',
      trip_id: opt.trip_id,
      direction_id: opt.direction_id,
      trip_headsign: opt.trip_headsign,
      departTime: this.formatTime(opt.departTime),
      arriveTime: this.formatTime(opt.arriveTime),
      duration: `${opt.durationMinutes} min`,
      durationMinutes: opt.durationMinutes,
      transfers: 0,
      legs: [
        {
          type: 'bus',
          route_id: opt.route_id,
          label: opt.route_short_name || opt.route_id.slice(-3),
          color: opt.route_color || '#E53935',
          from_stop: fromStop?.stop_name || fromStopId,
          to_stop: toStop?.stop_name || toStopId,
          duration: `${opt.durationMinutes} min`,
        },
      ],
    }));

    return {
      from_stop_id: fromStopId,
      from_stop_name: fromStop?.stop_name || fromStopId,
      to_stop_id: toStopId,
      to_stop_name: toStop?.stop_name || toStopId,
      options: result,
      total_options: tripOptions.length,
    };
  }

  private timeToSeconds(time: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    if (parts.length < 3) return 0;
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }

  private secondsToTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private formatTime(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
}
