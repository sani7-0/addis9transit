import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkPartitions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if vehicle_positions is partitioned
    const isPartitionedResult = await client.query(`
      SELECT 
        pg_class.relname AS partition_name,
        pg_namespace.nspname AS schema_name,
        pg_class.relkind AS partition_type
      FROM pg_inherits
      JOIN pg_class ON pg_inherits.inhrelid = pg_class.oid
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE pg_inherits.inhparent = 'vehicle_positions'::regclass;
    `);

    console.log('Is vehicle_positions partitioned?', isPartitionedResult.rowCount > 0);
    console.log('Partitions:', JSON.stringify(isPartitionedResult.rows, null, 2));

    // List all partitions using pg_partitioned_table (PostgreSQL 10+)
    const partitionsResult = await client.query(`
      SELECT 
        pg_class.relname AS partition_name,
        pg_catalog.pg_get_expr(d.relpartbound, d.oid) AS partition_bound_expression
      FROM pg_partitioned_table p
      JOIN pg_class ON p.partrelid = pg_class.oid
      JOIN pg_partition_rule d ON p.partrelid = d.partrelid
      WHERE pg_class.relname = 'vehicle_positions';
    `);

    console.log('All partitions:', JSON.stringify(partitionsResult.rows, null, 2));

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error checking partitions:', err);
  } finally {
    client.release();
  }
}

checkPartitions()
  .then(() => {
    console.log('Success');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });