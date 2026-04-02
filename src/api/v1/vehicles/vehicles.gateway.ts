import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VehiclesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VehiclesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(@Inject() private readonly vehiclesService: VehiclesService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToRoute')
  handleSubscribeToRoute(client: Socket, routeId: string): void {
    this.logger.log(`Client ${client.id} subscribed to route: ${routeId}`);
    client.join(`route_${routeId}`);
  }

  @SubscribeMessage('subscribeToStop')
  handleSubscribeToStop(client: Socket, stopId: string): void {
    this.logger.log(`Client ${client.id} subscribed to stop: ${stopId}`);
    client.join(`stop_${stopId}`);
  }

  // This method will be called by the VehiclesService when a position is updated
  async broadcastVehicleUpdate(vehicleData: {
    routeId?: string;
    stopId?: string;
    vehicleId: string;
    vehicle_label?: string;
    route_id?: string;
    route_short_name?: string;
    route_color?: string;
    trip_id?: string;
    direction_id?: number;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    passengers_onboard?: number;
    timestamp: string;
    is_simulated?: boolean;
  }) {
    const routeId = vehicleData.route_id || vehicleData.routeId;
    
    // Broadcast to route subscribers
    if (routeId) {
      this.server.to(`route_${routeId}`).emit('vehicleUpdate', vehicleData);
    }

    // Broadcast to all connected clients (for map view)
    this.server.emit('vehicleUpdate', vehicleData);

    // If stopId is provided, also broadcast to stop subscribers
    if (vehicleData.stopId) {
      this.server.to(`stop_${vehicleData.stopId}`).emit('vehicleUpdate', vehicleData);
    }
  }

  broadcastAllVehicles(vehicles: any[]) {
    this.server.emit('vehiclesUpdate', vehicles);
  }
}