import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agency } from './agency.entity';

@Entity('buses')
@Index(['agency_id'])
@Index(['bus_number'])
@Index(['license_plate'])
@Index(['is_active'])
export class Bus {
  @PrimaryGeneratedColumn('uuid')
  bus_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  bus_number: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  license_plate: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bus_model: string;

  @Column({ type: 'integer', default: 50 })
  capacity: number;

  @Column({ type: 'integer', nullable: true })
  year: number;

  @Column({ type: 'varchar', length: 50 })
  agency_id: string;

  @ManyToOne(() => Agency)
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  commission_date: Date;

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
