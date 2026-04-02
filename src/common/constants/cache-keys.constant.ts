export const CACHE_KEYS = {
  ROUTE: (routeId: string) => `route:${routeId}`,
  ROUTES_ALL: "routes:all",
  STOP: (stopId: string) => `stop:${stopId}`,
  STOPS_ALL: "stops:all",
  STOPS_NEARBY: (lat: number, lon: number, radius: number) =>
    `stops:nearby:${lat}:${lon}:${radius}`,
  ROUTE_STOPS: (routeId: string, directionId?: number) =>
    directionId
      ? `route:stops:${routeId}:${directionId}`
      : `route:stops:${routeId}`,
  STOP_ROUTES: (stopId: string) => `stop:routes:${stopId}`,
  ROUTE_SCHEDULE: (routeId: string, date: string, directionId?: number) =>
    directionId
      ? `route:schedule:${routeId}:${date}:${directionId}`
      : `route:schedule:${routeId}:${date}`,
  STOP_SCHEDULE: (stopId: string, date: string) =>
    `stop:schedule:${stopId}:${date}`,
  STOP_ETAS: (stopId: string) => `stop:etas:${stopId}`,
  VEHICLE_LIVE: (vehicleId: string) => `vehicle:live:${vehicleId}`,
  ROUTE_VEHICLES: (routeId: string, directionId?: number) =>
    directionId
      ? `route:vehicles:${routeId}:${directionId}`
      : `route:vehicles:${routeId}`,
  VEHICLES_ONLINE: "vehicles:online",
  HEALTH_OVERALL: "health:overall",
  HEALTH_DATABASE: "health:database",
  HEALTH_REDIS: "health:redis",
  HEALTH_GTF: "health:gtfs",
  HEALTH_VEHICLES: "health:vehicles",
};
