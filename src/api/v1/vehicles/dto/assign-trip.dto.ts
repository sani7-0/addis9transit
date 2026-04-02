import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTripDto {
  @ApiProperty({ description: 'Trip ID to assign' })
  @IsString()
  trip_id: string;

  @ApiPropertyOptional({ description: 'Route ID (optional, inferred from trip)' })
  @IsOptional()
  @IsString()
  route_id?: string;

  @ApiPropertyOptional({ description: 'Direction ID (optional, inferred from trip)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  direction_id?: number;

  @ApiPropertyOptional({ description: 'Start stop ID' })
  @IsOptional()
  @IsString()
  start_stop_id?: string;

  @ApiPropertyOptional({ description: 'End stop ID' })
  @IsOptional()
  @IsString()
  end_stop_id?: string;

  @ApiPropertyOptional({ description: 'Assignment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
