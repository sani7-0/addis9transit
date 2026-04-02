import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Bus } from './bus.entity';

@Entity('gps_devices')
@Index(['bus_id'])
@Index(['is_active'])
@Index(['serial_number'])
export class GpsDevice {
  @PrimaryGeneratedColumn('uuid')
  device_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string;

  @Column({ type: 'varchar', length: 50, default: 'tracker' })
  device_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_model: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string;

  @Column({ type: 'uuid', unique: true, nullable: true })
  bus_id: string;

  @ManyToOne(() => Bus)
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  firmware_version: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp without time zone', nullable: true })
  last_online_at: Date;

  @Column({ type: 'date', nullable: true })
  installation_date: Date;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
