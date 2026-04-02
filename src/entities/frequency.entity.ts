import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Trip } from './trip.entity';

@Entity('frequencies')
export class Frequency {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  trip_id: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ type: 'integer' })
  headway_secs: number;

  @Column({ type: 'boolean', default: false })
  exact_times: boolean;
}
