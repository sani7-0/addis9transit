import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Calendar } from './calendar.entity';

@Entity('calendar_dates')
export class CalendarDate {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  service_id: string;

  @ManyToOne(() => Calendar)
  @JoinColumn({ name: 'service_id' })
  calendar: Calendar;

  @PrimaryColumn({ type: 'date' })
  date: Date;

  @Column({ type: 'integer' })
  exception_type: number;
}
