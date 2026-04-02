import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('agency')
export class Agency {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  agency_id: string;

  @Column({ type: 'varchar', length: 255 })
  agency_name: string;

  @Column({ type: 'varchar', length: 255 })
  agency_url: string;

  @Column({ type: 'varchar', length: 50 })
  agency_timezone: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  agency_lang: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  agency_phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agency_fare_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agency_email: string;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
