import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";

import { ApiKey } from "../../entities/api-key.entity";
import { GpsDevice } from "../../entities/gps-device.entity";
import { Bus } from "../../entities/bus.entity";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(GpsDevice)
    private gpsDevicesRepository: Repository<GpsDevice>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    if (!apiKey) {
      this.logger.warn("API key missing in request");
      throw new UnauthorizedException("API key required");
    }

    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.apiKeyRepository.findOne({
      where: { api_key_hash: apiKeyHash, is_active: true },
      relations: ["device", "device.bus"],
    });

    if (!keyRecord) {
      this.logger.warn(
        `Invalid or inactive API key: ${apiKey.substring(0, 10)}...`,
      );
      throw new UnauthorizedException("Invalid API key");
    }

    if (keyRecord.expires_at && keyRecord.expires_at < new Date()) {
      this.logger.warn(`Expired API key for device: ${keyRecord.device_id}`);
      throw new UnauthorizedException("API key expired");
    }

    if (!keyRecord.device.is_active) {
      this.logger.warn(
        `Inactive device attempted connection: ${keyRecord.device_id}`,
      );
      throw new UnauthorizedException("Device is inactive");
    }

    if (keyRecord.device.bus && !keyRecord.device.bus.is_active) {
      this.logger.warn(
        `Inactive bus attempted connection: ${keyRecord.device.bus_id}`,
      );
      throw new UnauthorizedException("Bus is inactive");
    }

    request.device = keyRecord.device;
    request.apiKey = keyRecord;

    await this.apiKeyRepository.update(
      { key_id: keyRecord.key_id },
      { last_used_at: new Date() },
    );

    return true;
  }
}
