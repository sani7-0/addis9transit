import { IsOptional, IsInt, IsString, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindRoutesDto {
  @ApiPropertyOptional({ description: 'Number of routes to return' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of routes to skip' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ description: 'Search in route name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by route type' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  route_type?: number;

  @ApiPropertyOptional({ description: 'Filter by agency ID' })
  @IsOptional()
  @IsString()
  agency_id?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;
}
