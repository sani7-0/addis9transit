import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WinstonModule } from "nest-winston";

import { DatabaseConfig } from "./config/database.config";
import { AppLoggerConfig } from "./config/logger.config";

import { HealthModule } from "./health/health.module";
import { PublicRoutesModule } from "./public/routes/routes.module";
import { PublicStopsModule } from "./public/stops/stops.module";
import { PublicVehiclesModule } from "./public/vehicles/vehicles.module";
import { VehiclesModule } from "./api/v1/vehicles/vehicles.module";
import { AdminModule } from "./api/v1/admin/admin.module";
import { CacheModule } from "@nestjs/cache-manager";
import * as cacheManager from "cache-manager";

import { SmsModule } from "./sms/sms.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || "development"}`, ".env"],
      load: [
        DatabaseConfig,
        AppLoggerConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        
        // If DATABASE_URL is provided, parse it; otherwise use individual params
        if (databaseUrl && databaseUrl.startsWith("postgresql://")) {
          try {
            const url = new URL(databaseUrl);
            const useSsl = configService.get<boolean>("DATABASE_SSL", false);
            
            return {
              type: "postgres" as const,
              host: url.hostname,
              port: parseInt(url.port) || 5432,
              username: url.username,
              password: decodeURIComponent(url.password),
              database: url.pathname.slice(1),
              entities: [__dirname + "/**/*.entity{.ts,.js}"],
              synchronize: false,
              logging: configService.get<boolean>("DATABASE_LOGGING", false),
              ssl: useSsl ? { rejectUnauthorized: false } : false,
              extra: {
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
              },
            };
          } catch (error) {
            console.error("Failed to parse DATABASE_URL:", error);
            throw new Error("Invalid DATABASE_URL format");
          }
        }
        
        // Fallback to individual environment variables
        const useSslFallback = configService.get<boolean>("DATABASE_SSL", false);
        return {
          type: "postgres" as const,
          host: configService.get<string>("DB_HOST", "localhost"),
          port: configService.get<number>("DB_PORT", 5432),
          username: configService.get<string>("DB_USERNAME", "postgres"),
          password: configService.get<string>("DB_PASSWORD", ""),
          database: configService.get<string>("DB_DATABASE", "addistransit_dev"),
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          synchronize: false,
          logging: configService.get<boolean>("DATABASE_LOGGING", false),
          ssl: useSslFallback ? { rejectUnauthorized: false } : false,
          extra: {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
        };
      },
    }),
    CacheModule.register({
  isGlobal: true,
  store: cacheManager.memoryStore,
  ttl: 300,
}),

    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const winston = require("winston");
        const isPretty = configService.get<boolean>("LOG_PRETTY", false);
        
        return {
          level: configService.get<string>("LOG_LEVEL", "info"),
          format: isPretty 
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(
                  ({ timestamp, level, message, context, ...meta }) => {
                    return `${timestamp} [${level}] [${context}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
                  },
                ),
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json(),
              ),
          transports: [
            new winston.transports.Console(),
            new winston.transports.File({
              filename: "logs/error.log",
              level: "error",
              maxsize: 10485760,
              maxFiles: 14,
            }),
            new winston.transports.File({
              filename: "logs/combined.log",
              maxsize: 10485760,
              maxFiles: 90,
            }),
          ],
        };
      },
    }),
    HealthModule,
    PublicRoutesModule,
    PublicStopsModule,
    PublicVehiclesModule,
    VehiclesModule,
    AdminModule,
    SmsModule,
  ],
})
export class AppModule {}