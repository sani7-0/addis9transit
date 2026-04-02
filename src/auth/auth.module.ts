import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";

import { JwtService } from "./jwt.service";
import { AdminUser } from "../entities/admin-user.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AdminUser]),
  ],
  providers: [
    JwtService,
  ],
  exports: [JwtService],
})
export class AuthModule {}