import { IsString, IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FindStopScheduleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Stop ID" })
  stop_id?: string;

  @ApiPropertyOptional({ description: "Date in YYYY-MM-DD format" })
  @IsOptional()
  @IsDateString()
  date?: string;
}
