import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehicle_organizations')
export class VehicleOrganization {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  organization_id: string;

  @Column({ type: 'varchar', length: 255 })
  organization_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organization_url: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  organization_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organization_email: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}