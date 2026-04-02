import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateVehiclePositionDto {
  @ApiProperty({ description: "GPS latitude" })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: "GPS longitude" })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ description: "Altitude in meters" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  altitude?: number;

  @ApiPropertyOptional({ description: "Heading in degrees (0-360)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  @Type(() => Number)
  heading?: number;

  @ApiPropertyOptional({ description: "Speed in km/h" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  @Type(() => Number)
  speed?: number;

  @ApiPropertyOptional({ description: "GPS accuracy in meters" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracy?: number;

  @ApiPropertyOptional({ description: "Number of passengers on board" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  @Type(() => Number)
  passengers_onboard?: number;

  @ApiProperty({ description: "Timestamp from GPS device" })
  @IsDateString()
  timestamp: string;
}
