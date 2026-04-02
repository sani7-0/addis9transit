import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FindRouteVehiclesDto {
  @IsString()
  @ApiProperty({ description: "Route ID" })
  route_id: string;

  @ApiPropertyOptional({ description: "Filter by direction (0 or 1)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  direction_id?: number;
}
