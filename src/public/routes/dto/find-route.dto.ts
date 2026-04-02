import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class FindRouteDto {
  @IsString()
  @ApiProperty({ description: "Route ID" })
  route_id: string;
}
