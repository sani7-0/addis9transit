import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GpsDevice } from "../../entities/gps-device.entity";
import { ApiKey as ApiKeyEntity } from "../../entities/api-key.entity";

export const Device = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): GpsDevice => {
    const request = ctx.switchToHttp().getRequest();
    return request.device as GpsDevice;
  },
);

export const ApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKeyEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey as ApiKeyEntity;
  },
);
