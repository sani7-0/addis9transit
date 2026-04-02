import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('speed_history')
@Index(['route_id', 'day_of_week', 'hour_of_day'])
@Index(['route_id', 'segment_start', 'segment_end'])
export class SpeedHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  route_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  segment_start: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  segment_end: string;

  @Column({ type: 'integer', nullable: true })
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  @Column({ type: 'integer', nullable: true })
  hour_of_day: number; // 0-23

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  average_speed_kmh: number;

  @Column({ type: 'integer', default: 1 })
  sample_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  min_speed_kmh: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  max_speed_kmh: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  std_deviation: number;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}