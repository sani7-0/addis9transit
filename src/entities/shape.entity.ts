import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('shapes')
@Index(['shape_id'])
export class Shape {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  shape_id: string;

  @PrimaryColumn({ type: 'integer' })
  shape_pt_sequence: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  shape_pt_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  shape_pt_lon: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  shape_dist_traveled: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  geom: string;
}
