import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AdminUser } from './admin-user.entity';

@Entity('import_history')
@Index(['status', 'started_at'])
@Index(['import_type', 'started_at'])
@Index(['imported_by', 'started_at'])
export class ImportHistory {
  @PrimaryGeneratedColumn('increment')
  import_id: number;

  @Column({ type: 'varchar', length: 50, default: 'gtfs' })
  import_type: 'gtfs' | 'partial' | 'manual';

  @CreateDateColumn({ type: 'timestamp without time zone' })
  started_at: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  completed_at: Date;

  @Column({ type: 'varchar', length: 20 })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column({ type: 'integer', default: 0 })
  records_imported: number;

  @Column({ type: 'integer', default: 0 })
  records_failed: number;

  @Column({ type: 'integer', default: 0 })
  records_processed: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  source_file_path: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'uuid', nullable: true })
  imported_by: string;

  @ManyToOne(() => AdminUser)
  @JoinColumn({ name: 'imported_by' })
  imported_by_user: AdminUser;
}
