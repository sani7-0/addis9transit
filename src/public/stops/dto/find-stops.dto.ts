import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindStopsDto {
  @ApiPropertyOptional({ description: 'Number of stops to return' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of stops to skip' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ description: 'Search in stop name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by latitude' })
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'Filter by longitude' })
  @IsOptional()
  @Type(() => Number)
  lon?: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers' })
  @IsOptional()
  @Type(() => Number)
  radius?: number;
}
