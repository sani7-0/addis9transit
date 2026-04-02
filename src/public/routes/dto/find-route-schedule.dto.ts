import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FindRouteScheduleDto {
  @IsString()
  @ApiProperty({ description: "Route ID" })
  route_id: string;

  @ApiPropertyOptional({ description: "Filter by direction (0 or 1)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  direction_id?: number;

  @ApiPropertyOptional({ description: "Date in YYYY-MM-DD format" })
  @IsOptional()
  @IsDateString()
  date?: string;
}
