import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('eta_cache')
@Index(['stop_id', 'route_id'])
@Index(['last_updated'])
@Index(['vehicle_id'])
export class EtaCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  stop_id: string;

  @Column({ type: 'varchar', length: 50 })
  route_id: string;

  @Column({ type: 'integer', nullable: true })
  direction_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  trip_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicle_id: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_eta: Date;

  @Column({ type: 'timestamp', nullable: true })
  live_eta: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance_meters: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed_kmh: number;

  @Column({ type: 'integer', default: 0 })
  delay_minutes: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}