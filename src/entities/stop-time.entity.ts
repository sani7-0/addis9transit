import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Trip } from './trip.entity';
import { Stop } from './stop.entity';

@Entity('stop_times')
@Index(['stop_id'])
@Index(['trip_id'])
@Index(['arrival_time'])
@Index(['departure_time'])
export class StopTime {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  trip_id: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'time' })
  arrival_time: string;

  @Column({ type: 'time' })
  departure_time: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  stop_id: string;

  @ManyToOne(() => Stop)
  @JoinColumn({ name: 'stop_id' })
  stop: Stop;

  @PrimaryColumn({ type: 'integer' })
  stop_sequence: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stop_headsign: string;

  @Column({ type: 'integer', nullable: true, default: 0 })
  pickup_type: number;

  @Column({ type: 'integer', nullable: true, default: 0 })
  drop_off_type: number;

  @Column({ type: 'integer', nullable: true, default: 0 })
  continuous_pickup: number;

  @Column({ type: 'integer', nullable: true, default: 0 })
  continuous_drop_off: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  shape_dist_traveled: number;

  @Column({ type: 'boolean', default: false })
  timepoint: boolean;
}
