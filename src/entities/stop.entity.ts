import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('stops')
@Index(['stop_lat', 'stop_lon'])
@Index(['parent_station'])
@Index(['location_type'])
@Index(['stop_name'])
export class Stop {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  stop_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stop_code: string;

  @Column({ type: 'varchar', length: 255 })
  stop_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  stop_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  stop_lon: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stop_url: string;

  @Column({ type: 'integer', default: 0 })
  location_type: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parent_station: string;

  @ManyToOne(() => Stop)
  @JoinColumn({ name: 'parent_station' })
  parent_stop: Stop;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stop_timezone: string;

  @Column({ type: 'integer', default: 0 })
  wheelchair_boarding: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  level_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform_code: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  geom: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
