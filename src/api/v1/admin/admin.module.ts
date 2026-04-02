import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { Bus } from "../../../entities/bus.entity";
import { GpsDevice } from "../../../entities/gps-device.entity";
import { ApiKey } from "../../../entities/api-key.entity";
import { VehicleAssignment } from "../../../entities/vehicle-assignment.entity";
import { Trip } from "../../../entities/trip.entity";
import { Agency } from "../../../entities/agency.entity";


import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { JwtService } from "../../../auth/jwt.service";
import { AuthModule } from "../../../auth/auth.module";
import { CacheModule } from "@nestjs/cache-manager";


@Module({
  imports: [
    ConfigModule,
    CacheModule.register(),
    AuthModule,
    TypeOrmModule.forFeature([
      Bus,
      GpsDevice,
      ApiKey,
      VehicleAssignment,
      Trip,
      Agency,
    ]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>("THROTTLE_TTL", 60000),
          limit: configService.get<number>("THROTTLE_LIMIT", 100),
          ignoreUserAgents: [],
        },
        {
          ttl: 300000,
          limit: 5,
          skipIf: (context: any) => {
            const request = context.switchToHttp().getRequest();
            return request.url.includes("/login");
          },
        },
      ],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
