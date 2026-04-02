import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
@Index(['email'])
@Index(['role', 'is_active'])
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 50, default: 'admin' })
  role: 'super_admin' | 'admin' | 'operator' | 'viewer';

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp without time zone', nullable: true })
  last_login_at: Date;

  @CreateDateColumn({ type: 'timestamp without time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  updated_at: Date;
}
