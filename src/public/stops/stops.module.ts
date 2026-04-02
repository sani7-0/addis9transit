import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Stop } from '../../entities/stop.entity';
import { StopTime } from '../../entities/stop-time.entity';
import { Trip } from '../../entities/trip.entity';
import { Route } from '../../entities/route.entity';

import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Stop, StopTime, Trip, Route]),
  ],
  controllers: [StopsController],
  providers: [StopsService],
  exports: [StopsService],
})
export class PublicStopsModule {}
