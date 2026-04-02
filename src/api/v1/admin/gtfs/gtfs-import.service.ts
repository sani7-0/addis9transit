import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ImportHistory } from '../../../../entities/import-history.entity';
import { Route } from '../../../../entities/route.entity';
import { Stop } from '../../../../entities/stop.entity';
import { Trip } from '../../../../entities/trip.entity';
import { StopTime } from '../../../../entities/stop-time.entity';
import { Calendar } from '../../../../entities/calendar.entity';
import { CalendarDate } from '../../../../entities/calendar-date.entity';
import { Shape } from '../../../../entities/shape.entity';
import { Frequency } from '../../../../entities/frequency.entity';
import { Agency } from '../../../../entities/agency.entity';

export interface GtfsImportResult {
  import_id: number;
  status: 'success' | 'partial' | 'failed';
  summary: {
    routes_imported: number;
    stops_imported: number;
    trips_imported: number;
    stop_times_imported: number;
    calendar_imported: number;
    calendar_dates_imported: number;
    shapes_imported: number;
    frequencies_imported: number;
    errors: string[];
    warnings: string[];
  };
  started_at: string;
  completed_at: string;
}

@Injectable()
export class GtfsImportService {
  private readonly logger = new Logger(GtfsImportService.name);

  constructor(
    @InjectRepository(ImportHistory)
    private importHistoryRepository: Repository<ImportHistory>,
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @InjectRepository(Stop)
    private stopsRepository: Repository<Stop>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    @InjectRepository(StopTime)
    private stopTimesRepository: Repository<StopTime>,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
    @InjectRepository(CalendarDate)
    private calendarDatesRepository: Repository<CalendarDate>,
    @InjectRepository(Shape)
    private shapesRepository: Repository<Shape>,
    @InjectRepository(Frequency)
    private frequenciesRepository: Repository<Frequency>,
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async importGtfsData(
    gtfsData: any,
    adminUserId: string,
  ): Promise<GtfsImportResult> {
    const startTime = Date.now();
    const importRecord = this.importHistoryRepository.create({
      import_type: 'gtfs',
      status: 'in_progress',
      started_at: new Date(),
      records_imported: 0,
      records_failed: 0,
      records_processed: 0,
      version: `1.0.0_${Date.now()}`,
      source_file_path: `gtfs_import_${new Date().toISOString()}.json`,
      imported_by: adminUserId,
    });

    await this.importHistoryRepository.save(importRecord);

    const summary = {
      routes_imported: 0,
      stops_imported: 0,
      trips_imported: 0,
      stop_times_imported: 0,
      calendar_imported: 0,
      calendar_dates_imported: 0,
      shapes_imported: 0,
      frequencies_imported: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Import in transaction
      await this.dataSource.transaction(async (manager) => {
        // Import Agency if provided
        if (gtfsData.agency && gtfsData.agency.length > 0) {
          await this.importAgency(gtfsData.agency, manager);
        }

        // Import Routes
        if (gtfsData.routes && gtfsData.routes.length > 0) {
          summary.routes_imported = await this.importRoutes(gtfsData.routes, manager);
        }

        // Import Stops
        if (gtfsData.stops && gtfsData.stops.length > 0) {
          summary.stops_imported = await this.importStops(gtfsData.stops, manager);
        }

        // Import Calendar
        if (gtfsData.calendar && gtfsData.calendar.length > 0) {
          summary.calendar_imported = await this.importCalendar(gtfsData.calendar, manager);
        }

        // Import Calendar Dates
        if (gtfsData.calendar_dates && gtfsData.calendar_dates.length > 0) {
          summary.calendar_dates_imported = await this.importCalendarDates(gtfsData.calendar_dates, manager);
        }

        // Import Trips
        if (gtfsData.trips && gtfsData.trips.length > 0) {
          summary.trips_imported = await this.importTrips(gtfsData.trips, manager);
        }

        // Import Stop Times
        if (gtfsData.stop_times && gtfsData.stop_times.length > 0) {
          summary.stop_times_imported = await this.importStopTimes(gtfsData.stop_times, manager);
        }

        // Import Shapes
        if (gtfsData.shapes && gtfsData.shapes.length > 0) {
          summary.shapes_imported = await this.importShapes(gtfsData.shapes, manager);
        }

        // Import Frequencies
        if (gtfsData.frequencies && gtfsData.frequencies.length > 0) {
          summary.frequencies_imported = await this.importFrequencies(gtfsData.frequencies, manager);
        }
      });

      // Update import record
      importRecord.status = 'completed';
      importRecord.completed_at = new Date();
      importRecord.records_processed =
        summary.routes_imported +
        summary.stops_imported +
        summary.trips_imported +
        summary.stop_times_imported +
        summary.calendar_imported +
        summary.calendar_dates_imported +
        summary.shapes_imported +
        summary.frequencies_imported;
      importRecord.records_imported = importRecord.records_processed;

      await this.importHistoryRepository.save(importRecord);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `GTFS import completed: ${importRecord.records_processed} records in ${processingTime}ms`,
      );

      return {
        import_id: importRecord.import_id,
        status: 'success',
        summary,
        started_at: importRecord.started_at.toISOString(),
        completed_at: importRecord.completed_at.toISOString(),
      };
    } catch (error) {
      // Update import record with error
      importRecord.status = 'failed';
      importRecord.completed_at = new Date();
      importRecord.error_message = error.message;
      await this.importHistoryRepository.save(importRecord);

      this.logger.error(`GTFS import failed: ${error.message}`);

      return {
        import_id: importRecord.import_id,
        status: 'failed',
        summary: {
          ...summary,
          errors: [...summary.errors, error.message],
        },
        started_at: importRecord.started_at.toISOString(),
        completed_at: importRecord.completed_at.toISOString(),
      };
    }
  }

  private async importAgency(agencyData: any[], manager: any): Promise<void> {
    for (const agency of agencyData) {
      await manager.upsert(Agency, {
        agency_id: agency.agency_id,
        agency_name: agency.agency_name,
        agency_url: agency.agency_url,
        agency_timezone: agency.agency_timezone,
        agency_lang: agency.agency_lang,
        agency_phone: agency.agency_phone,
        agency_fare_url: agency.agency_fare_url,
        agency_email: agency.agency_email,
      }, ['agency_id']);
    }
  }

  private async importRoutes(routesData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const route of routesData) {
      await manager.upsert(Route, {
        route_id: route.route_id,
        agency_id: route.agency_id || 'AA',
        route_short_name: route.route_short_name,
        route_long_name: route.route_long_name,
        route_type: route.route_type || 3,
        route_desc: route.route_desc,
        route_url: route.route_url,
        route_color: route.route_color?.replace('#', ''),
        route_text_color: route.route_text_color?.replace('#', ''),
        route_sort_order: route.route_sort_order,
      }, ['route_id']);
      count++;
    }
    return count;
  }

  private async importStops(stopsData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const stop of stopsData) {
      await manager.upsert(Stop, {
        stop_id: stop.stop_id,
        stop_code: stop.stop_code,
        stop_name: stop.stop_name,
        stop_desc: stop.stop_desc,
        stop_lat: stop.stop_lat,
        stop_lon: stop.stop_lon,
        zone_id: stop.zone_id,
        stop_url: stop.stop_url,
        location_type: stop.location_type,
        parent_station: stop.parent_station,
        stop_timezone: stop.stop_timezone,
        wheelchair_boarding: stop.wheelchair_boarding,
        level_id: stop.level_id,
        platform_code: stop.platform_code,
      }, ['stop_id']);
      count++;
    }
    return count;
  }

  private async importCalendar(calendarData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const cal of calendarData) {
      await manager.upsert(Calendar, {
        service_id: cal.service_id,
        monday: cal.monday,
        tuesday: cal.tuesday,
        wednesday: cal.wednesday,
        thursday: cal.thursday,
        friday: cal.friday,
        saturday: cal.saturday,
        sunday: cal.sunday,
        start_date: cal.start_date,
        end_date: cal.end_date,
      }, ['service_id']);
      count++;
    }
    return count;
  }

  private async importCalendarDates(calendarDatesData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const calDate of calendarDatesData) {
      await manager.upsert(CalendarDate, {
        service_id: calDate.service_id,
        date: calDate.date,
        exception_type: calDate.exception_type,
      }, ['service_id', 'date']);
      count++;
    }
    return count;
  }

  private async importTrips(tripsData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const trip of tripsData) {
      await manager.upsert(Trip, {
        trip_id: trip.trip_id,
        route_id: trip.route_id,
        service_id: trip.service_id,
        trip_headsign: trip.trip_headsign,
        trip_short_name: trip.trip_short_name,
        direction_id: trip.direction_id,
        block_id: trip.block_id,
        shape_id: trip.shape_id,
        wheelchair_accessible: trip.wheelchair_accessible,
        bikes_allowed: trip.bikes_allowed,
      }, ['trip_id']);
      count++;
    }
    return count;
  }

  private async importStopTimes(stopTimesData: any[], manager: any): Promise<number> {
    let count = 0;
    // Process in batches for performance
    const batchSize = 1000;
    for (let i = 0; i < stopTimesData.length; i += batchSize) {
      const batch = stopTimesData.slice(i, i + batchSize);
      const entities = batch.map(st => ({
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
      }));

      await manager.save(StopTime, entities);
      count += batch.length;
    }
    return count;
  }

  private async importShapes(shapesData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const shape of shapesData) {
      await manager.upsert(Shape, {
        shape_id: shape.shape_id,
        shape_pt_sequence: shape.shape_pt_sequence,
        shape_pt_lat: shape.shape_pt_lat,
        shape_pt_lon: shape.shape_pt_lon,
        shape_dist_traveled: shape.shape_dist_traveled,
      }, ['shape_id', 'shape_pt_sequence']);
      count++;
    }
    return count;
  }

  private async importFrequencies(frequenciesData: any[], manager: any): Promise<number> {
    let count = 0;
    for (const freq of frequenciesData) {
      await manager.upsert(Frequency, {
        trip_id: freq.trip_id,
        start_time: freq.start_time,
        end_time: freq.end_time,
        headway_secs: freq.headway_secs,
        exact_times: freq.exact_times,
      }, ['trip_id', 'start_time']);
      count++;
    }
    return count;
  }

  async getImportHistory(limit: number = 10): Promise<ImportHistory[]> {
    return this.importHistoryRepository.find({
      order: { started_at: 'DESC' },
      take: limit,
    });
  }

  async getImportStatus(importId: number): Promise<ImportHistory> {
    const importRecord = await this.importHistoryRepository.findOne({
      where: { import_id: importId },
    });

    if (!importRecord) {
      throw new NotFoundException(`Import with ID ${importId} not found`);
    }

    return importRecord;
  }
}