import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Route } from '../../entities/route.entity';
import { Stop } from '../../entities/stop.entity';
import { StopTime } from '../../entities/stop-time.entity';
import { Trip } from '../../entities/trip.entity';
import { Calendar } from '../../entities/calendar.entity';

import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Route, Stop, StopTime, Trip, Calendar]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class PublicRoutesModule {}
