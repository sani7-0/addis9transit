import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindStopEtasDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Stop ID' })
  stop_id?: string;
}