import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agency } from './agency.entity';

@Entity('routes')
@Index(['agency_id'])
@Index(['route_type'])
@Index(['is_active'])
@Index(['route_long_name', 'route_short_name'])
export class Route {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  route_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  agency_id: string;

  @ManyToOne(() => Agency)
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ type: 'varchar', length: 50, nullable: true })
  route_short_name: string;

  @Column({ type: 'varchar', length: 255 })
  route_long_name: string;

  @Column({ type: 'integer' })
  route_type: number;

  @Column({ type: 'text', nullable: true })
  route_desc: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route_url: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  route_color: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  route_text_color: string;

  @Column({ type: 'integer', nullable: true })
  route_sort_order: number;

  @Column({ type: 'integer', default: 0 })
  continuous_pickup: number;

  @Column({ type: 'integer', default: 0 })
  continuous_drop_off: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
