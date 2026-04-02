import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { GpsDevice } from "./gps-device.entity";
import { Bus } from "./bus.entity";

@Entity("vehicle_positions")
@Index(["device_id", "received_at"])
@Index(["bus_id", "received_at"])
@Index(["trip_id", "received_at"])
@Index(["route_id", "received_at"])
@Index(["received_at"])
export class VehiclePosition {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ type: "uuid" })
  device_id: string;

  @ManyToOne(() => GpsDevice)
  @JoinColumn({ name: "device_id" })
  device: GpsDevice;

  @Column({ type: "uuid", nullable: true })
  bus_id: string;

  @ManyToOne(() => Bus)
  @JoinColumn({ name: "bus_id" })
  bus: Bus;

  @Column({ type: "varchar", length: 50, nullable: true })
  trip_id: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  route_id: string;

  @Column({ type: "decimal", precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  altitude: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  speed: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: "integer", default: 0 })
  passengers_onboard: number;

  @Column({ type: "timestamp without time zone" })
  recorded_at: Date;

  @CreateDateColumn({ type: "timestamp without time zone" })
  received_at: Date;

  @Column({ type: "boolean", default: true })
  is_valid: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  validation_reason: string;

  @Column({
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
  })
  geom: string;
}
