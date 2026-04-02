import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GpsDevice } from './gps-device.entity';
import { Bus } from './bus.entity';

@Entity('gps_validation_events')
@Index(['device_id', 'created_at'])
@Index(['bus_id', 'created_at'])
@Index(['validation_result', 'created_at'])
export class GpsValidationEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  event_id: number;

  @Column({ type: 'uuid', nullable: true })
  device_id: string;

  @ManyToOne(() => GpsDevice)
  @JoinColumn({ name: 'device_id' })
  device: GpsDevice;

  @Column({ type: 'uuid', nullable: true })
  bus_id: string;

  @ManyToOne(() => Bus)
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'timestamp without time zone', nullable: true })
  recorded_at: Date;

  @Column({ type: 'varchar', length: 20 })
  validation_result: 'accepted' | 'rejected' | 'flagged';

  @Column({ type: 'varchar', length: 255, nullable: true })
  rejection_reason: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed_kmh: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  distance_km: number;

  @Column({ type: 'integer', nullable: true })
  time_diff_seconds: number;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;
}
