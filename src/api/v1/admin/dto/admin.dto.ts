import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBusDto {
  @ApiProperty({ description: 'Bus number/fleet number' })
  @IsString()
  bus_number: string;

  @ApiPropertyOptional({ description: 'License plate' })
  @IsOptional()
  @IsString()
  license_plate?: string;

  @ApiPropertyOptional({ description: 'Bus model' })
  @IsOptional()
  @IsString()
  bus_model?: string;

  @ApiPropertyOptional({ description: 'Capacity' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Year of manufacture' })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Type(() => Number)
  year?: number;

  @ApiProperty({ description: 'Agency ID' })
  @IsString()
  agency_id: string;

  @ApiPropertyOptional({ description: 'Commission date' })
  @IsOptional()
  @Type(() => Date)
  commission_date?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGpsDeviceDto {
  @ApiProperty({ description: 'Bus ID to attach device to' })
  @IsString()
  bus_id: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  device_name?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  device_type?: string;

  @ApiPropertyOptional({ description: 'Device model' })
  @IsOptional()
  @IsString()
  device_model?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ description: 'Firmware version' })
  @IsOptional()
  @IsString()
  firmware_version?: string;

  @ApiPropertyOptional({ description: 'Installation date' })
  @IsOptional()
  @Type(() => Date)
  installation_date?: Date;
}

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Device ID' })
  @IsString()
  device_id: string;

  @ApiPropertyOptional({ description: 'Key name for identification' })
  @IsOptional()
  @IsString()
  key_name?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @Type(() => Date)
  expires_at?: Date;
}

export class AdminAssignTripDto {
  @ApiProperty({ description: 'Bus ID' })
  @IsString()
  bus_id: string;

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
