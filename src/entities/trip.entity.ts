import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from './route.entity';
import { Calendar } from './calendar.entity';

@Entity('trips')
@Index(['route_id'])
@Index(['service_id'])
@Index(['direction_id'])
@Index(['block_id'])
@Index(['is_active'])
export class Trip {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  trip_id: string;

  @Column({ type: 'varchar', length: 50 })
  route_id: string;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ type: 'varchar', length: 50 })
  service_id: string;

  @ManyToOne(() => Calendar)
  @JoinColumn({ name: 'service_id' })
  service: Calendar;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trip_headsign: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trip_short_name: string;

  @Column({ type: 'integer', nullable: true })
  direction_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  block_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  shape_id: string;

  @Column({ type: 'integer', default: 0 })
  wheelchair_accessible: number;

  @Column({ type: 'integer', default: 0 })
  bikes_allowed: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
