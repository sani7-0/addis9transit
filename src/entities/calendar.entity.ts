import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('calendar')
@Index(['start_date', 'end_date'])
export class Calendar {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  service_id: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'boolean', default: false })
  monday: boolean;

  @Column({ type: 'boolean', default: false })
  tuesday: boolean;

  @Column({ type: 'boolean', default: false })
  wednesday: boolean;

  @Column({ type: 'boolean', default: false })
  thursday: boolean;

  @Column({ type: 'boolean', default: false })
  friday: boolean;

  @Column({ type: 'boolean', default: false })
  saturday: boolean;

  @Column({ type: 'boolean', default: false })
  sunday: boolean;
}
