import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VehicleStatusDto {
  @IsString()
  @ApiProperty({ description: 'Bus ID' })
  bus_id: string;

  @IsEnum(['en_route', 'at_terminal', 'maintenance', 'inactive'])
  @ApiProperty({ description: 'Bus status' })
  status: 'en_route' | 'at_terminal' | 'maintenance' | 'inactive';
}
