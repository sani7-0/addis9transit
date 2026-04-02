import { IsString, IsOptional, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class FindStopDto {
  @IsString()
  @ApiProperty({ description: "Stop ID" })
  stop_id: string;
}
