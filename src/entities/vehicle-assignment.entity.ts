import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Bus } from './bus.entity';
import { GpsDevice } from './gps-device.entity';

@Entity('vehicle_assignments')
@Index(['bus_id', 'assigned_at'])
@Index(['device_id', 'assigned_at'])
@Index(['trip_id', 'assigned_at'])
@Index(['route_id', 'assigned_at'])
@Index(['status', 'assigned_at'])
@Index(['bus_id'])
export class VehicleAssignment {
  @PrimaryGeneratedColumn('uuid')
  assignment_id: string;

  @Column({ type: 'uuid' })
  bus_id: string;

  @ManyToOne(() => Bus)
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ type: 'uuid' })
  device_id: string;

  @ManyToOne(() => GpsDevice)
  @JoinColumn({ name: 'device_id' })
  device: GpsDevice;

  @Column({ type: 'varchar', length: 50, nullable: true })
  trip_id: string;

  @Column({ type: 'varchar', length: 50 })
  route_id: string;

  @Column({ type: 'integer', nullable: true })
  direction_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  start_stop_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  end_stop_id: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  assigned_at: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  unassigned_at: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  assigned_by: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'completed' | 'cancelled' | 'break';

  @Column({ type: 'text', nullable: true })
  notes: string;
}
