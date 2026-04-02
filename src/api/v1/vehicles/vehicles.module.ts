import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Bus } from '../../../entities/bus.entity';
import { GpsDevice } from '../../../entities/gps-device.entity';
import { VehiclePosition } from '../../../entities/vehicle-position.entity';
import { VehicleAssignment } from '../../../entities/vehicle-assignment.entity';
import { GpsValidationEvent } from '../../../entities/gps-validation-event.entity';
import { Trip } from '../../../entities/trip.entity';
import { Route } from '../../../entities/route.entity';
import { Shape } from '../../../entities/shape.entity';
import { StopTime } from '../../../entities/stop-time.entity';
import { ApiKey } from '../../../entities/api-key.entity';

import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehiclesGateway } from './vehicles.gateway';
import { VehicleSimulationService } from './vehicle-simulation.service';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Bus, GpsDevice, VehiclePosition, VehicleAssignment, GpsValidationEvent, Trip, Route, Shape, StopTime, ApiKey]),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesGateway, VehicleSimulationService, ApiKeyGuard],
  exports: [VehiclesService, VehiclesGateway, VehicleSimulationService],
})
export class VehiclesModule {}