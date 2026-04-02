import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { Bus } from "../../entities/bus.entity";
import { VehiclePosition } from "../../entities/vehicle-position.entity";
import { VehicleAssignment } from "../../entities/vehicle-assignment.entity";

import { PublicVehiclesController } from "./vehicles.controller";
import { PublicVehiclesService } from "./vehicles.service";
import { VehiclesModule } from "../../api/v1/vehicles/vehicles.module";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Bus, VehiclePosition, VehicleAssignment]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>("THROTTLE_TTL", 60000),
          limit: configService.get<number>("THROTTLE_LIMIT", 100),
          ignoreUserAgents: [],
        },
      ],
    }),
    forwardRef(() => VehiclesModule),
  ],
  controllers: [PublicVehiclesController],
  providers: [PublicVehiclesService],
  exports: [PublicVehiclesService],
})
export class PublicVehiclesModule {}
