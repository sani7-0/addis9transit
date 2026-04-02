import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";

import { Route } from "../entities/route.entity";
import { Stop } from "../entities/stop.entity";
import { StopTime } from "../entities/stop-time.entity";

import { SmsController } from "./sms.controller";
import { SmsService } from "./sms.service";
import { SmsSessionService } from "./sms-session.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Route, Stop, StopTime]),
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsSessionService],
  exports: [SmsService],
})
export class SmsModule {}
