import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Route } from "../entities/route.entity";
import { Stop } from "../entities/stop.entity";
import { StopTime } from "../entities/stop-time.entity";
import { SmsSessionService } from "./sms-session.service";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(Route) private routesRepo: Repository<Route>,
    @InjectRepository(Stop) private stopsRepo: Repository<Stop>,
    @InjectRepository(StopTime) private stopTimesRepo: Repository<StopTime>,
    private sessionService: SmsSessionService,
    private configService: ConfigService,
  ) {}

  async handleIncoming(phone: string, text: string): Promise<string> {
    const msg = text.trim().toUpperCase();

    // Reset session
    if (msg === "MENU" || msg === "START" || msg === "HI" || msg === "HELP") {
      this.sessionService.reset(phone);
      return this.mainMenu();
    }

    const session = this.sessionService.get(phone);

    // No session - start fresh
    if (!session) {
      return this.mainMenu();
    }

    switch (session.step) {
      case "main_menu":
        return this.handleMainMenu(phone, msg);
      case "select_route":
        return this.handleRouteSelect(phone, msg, session);
      case "select_stop":
        return this.handleStopSelect(phone, msg, session);
      default:
        return this.mainMenu();
    }
  }

  private mainMenu(): string {
    return `AddisTransit
Reply with a number:
1. Route schedule
2. Next bus ETAs
3. Nearby stops
4. Help
Reply MENU anytime`;
  }

  private async handleMainMenu(phone: string, choice: string): Promise<string> {
    switch (choice) {
      case "1":
        return await this.showRouteList(phone);
      case "2":
        return await this.showRouteList(phone, true);
      case "3":
        return this.showNearbyStops();
      case "4":
        return `AddisTransit v1.0
View bus schedules, ETAs & routes in Addis Ababa.
Reply MENU to start.`;
      default:
        return `Invalid option. Reply with 1-4
${this.mainMenu()}`;
    }
  }

  private async showRouteList(phone: string, isEta = false): Promise<string> {
    const routes = await this.routesRepo.find({ take: 8 });
    this.sessionService.set(phone, isEta ? "select_route_eta" : "select_route");

    const lines = routes.slice(0, 6).map((r, i) =>
      `${i + 1}. ${r.route_short_name || r.route_id.slice(-3)} - ${r.route_long_name?.slice(0, 20) || ""}`
    ).join("\n");

    return `Choose route:
${lines}
7. More routes...
Reply number`;
  }

  private async handleRouteSelect(phone: string, choice: string, session: any): Promise<string> {
    const routes = await this.routesRepo.find({ take: 8 });
    const idx = parseInt(choice) - 1;

    if (idx >= 0 && idx < routes.length) {
      const route = routes[idx];
      session.data.routeId = route.route_id;
      session.data.routeName = route.route_short_name || route.route_id.slice(-3);
      this.sessionService.set(phone, "select_stop", session.data);

      const stops = await this.stopTimesRepo
        .createQueryBuilder("st")
        .innerJoin("st.stop", "stop")
        .where("st.trip_id IN (SELECT trip_id FROM trips WHERE route_id = :routeId)", { routeId: route.route_id })
        .select("DISTINCT stop.stop_id, stop.stop_name")
        .limit(6)
        .getRawMany();

      const stopLines = stops.slice(0, 5).map((s: any, i: number) =>
        `${i + 1}. ${s.stop_stop_name?.slice(0, 25) || s.stop_id}`
      ).join("\n");

      return `${session.data.routeName} stops:
${stopLines}
Reply number`;
    }

    return `Invalid. Choose 1-${routes.length}`;
  }

  private async handleStopSelect(phone: string, choice: string, session: any): Promise<string> {
    const routeId = session.data?.routeId;
    if (!routeId) return this.mainMenu();

    const stops = await this.stopTimesRepo
      .createQueryBuilder("st")
      .innerJoin("st.stop", "stop")
      .where("st.trip_id IN (SELECT trip_id FROM trips WHERE route_id = :routeId)", { routeId })
      .select("DISTINCT stop.stop_id, stop.stop_name")
      .limit(6)
      .getRawMany();

    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < stops.length) {
      const stopId = stops[idx].stop_stop_id;
      const stopName = stops[idx].stop_stop_name;

      const now = new Date();
      const currentSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      const times = await this.stopTimesRepo
        .createQueryBuilder("st")
        .innerJoin("st.trip", "trip")
        .where("st.stop_id = :stopId", { stopId })
        .andWhere("trip.route_id = :routeId", { routeId })
        .orderBy("st.arrival_time", "ASC")
        .limit(5)
        .getMany();

      const etaLines = times
        .filter(st => {
          const parts = st.arrival_time.split(":").map(Number);
          const arrSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          return arrSec > currentSec;
        })
        .slice(0, 3)
        .map((st, i) => {
          const parts = st.arrival_time.split(":").map(Number);
          const arrSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          const mins = Math.round((arrSec - currentSec) / 60);
          return `${i + 1}. In ${mins} mins (${st.arrival_time.slice(0, 5)})`;
        })
        .join("\n");

      this.sessionService.reset(phone);

      return `${session.data.routeName} at ${stopName?.slice(0, 20)}:
${etaLines || "No more buses today"}

Reply MENU`;
    }

    return `Invalid. Choose 1-${stops.length}`;
  }

  private showNearbyStops(): string {
    return `Send location via app for nearby stops.
Or text a stop name:
e.g. Megenagna
Reply MENU`;
  }
}
