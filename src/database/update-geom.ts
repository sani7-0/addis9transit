import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateGeom() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable PostGIS extension if not already enabled
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled');

    // Update geom column in stops table where geom is null or we want to refresh from lat/lon
    const stopsResult = await client.query(`
      UPDATE stops
      SET geom = ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)
      WHERE stop_lat IS NOT NULL AND stop_lon IS NOT NULL AND (geom IS NULL OR geom = '0101000020E6100000000000000000000000000000'::geometry);
    `);
    console.log(`Updated ${stopsResult.rowCount} stops with geometry`);

    // Update geom column in shapes table (if it exists)
    try {
      const shapesResult = await client.query(`
        UPDATE shapes
        SET geom = ST_SetSRID(ST_MakePoint(shape_pt_lon, shape_pt_lat), 4326)
        WHERE shape_pt_lat IS NOT NULL AND shape_pt_lon IS NOT NULL AND (geom IS NULL OR geom = '0101000020E6100000000000000000000000000000'::geometry);
      `);
      console.log(`Updated ${shapesResult.rowCount} shapes with geometry`);
    } catch (err) {
      console.log('Shapes table might not exist or already updated:', err.message);
    }

    // Create spatial index on stops.geom if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stops_geom') THEN
          CREATE INDEX idx_stops_geom ON stops USING GIST (geom);
          RAISE NOTICE 'Created index idx_stops_geom';
        ELSE
          RAISE NOTICE 'Index idx_stops_geom already exists';
        END IF;
      END $$;
    `);

    // Create spatial index on shapes.geom if not exists
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shapes_geom') THEN
            CREATE INDEX idx_shapes_geom ON shapes USING GIST (geom);
            RAISE NOTICE 'Created index idx_shapes_geom';
          ELSE
            RAISE NOTICE 'Index idx_shapes_geom already exists';
          END IF;
        END $$;
      `);
    } catch (err) {
      console.log('Could not create index on shapes.geom:', err.message);
    }

    await client.query('COMMIT');
    console.log('Geometry update completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating geometry:', err);
    throw err;
  } finally {
    client.release();
  }
}

updateGeom()
  .then(() => {
    console.log('Success');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });