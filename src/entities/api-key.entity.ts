import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GpsDevice } from './gps-device.entity';

@Entity('api_keys')
@Index(['device_id'])
@Index(['api_key_hash'])
@Index(['api_key_prefix'])
@Index(['is_active', 'expires_at'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  key_id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  api_key_hash: string;

  @Column({ type: 'varchar', length: 10 })
  api_key_prefix: string;

  @Column({ type: 'uuid' })
  device_id: string;

  @ManyToOne(() => GpsDevice)
  @JoinColumn({ name: 'device_id' })
  device: GpsDevice;

  @Column({ type: 'varchar', length: 100, nullable: true })
  key_name: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp without time zone', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  last_used_at: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  created_by: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
