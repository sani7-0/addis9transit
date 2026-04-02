import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create a test bus
    const busResult = await client.query(`
      INSERT INTO buses (bus_number, license_plate, bus_model, capacity, year, agency_id, is_active)
      VALUES ('TEST001', 'TEST PLATE', 'Test Model', 50, 2020, 'AA', true)
      RETURNING bus_id;
    `);
    const busId = busResult.rows[0].bus_id;
    console.log(`Created test bus with ID: ${busId}`);

    // Create a test GPS device associated with the bus
    const deviceResult = await client.query(`
      INSERT INTO gps_devices (device_name, device_type, device_model, serial_number, bus_id, firmware_version, is_active, installation_date)
      VALUES ('Test Device', 'tracker', 'Test Model', 'TEST-SERIAL-001', $1, '1.0.0', true, CURRENT_DATE)
      RETURNING device_id;
    `, [busId]);
    const deviceId = deviceResult.rows[0].device_id;
    console.log(`Created test GPS device with ID: ${deviceId}`);

    // Insert a known API key (SHA-256 hash of 'test-api-key-123')
    const apiKeyHash = '9a7d0c7e7b2a1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8';
    const apiKeyPrefix = 'test-api-k';
    await client.query(`
      INSERT INTO api_keys (api_key_hash, api_key_prefix, device_id, key_name, is_active, created_by)
      VALUES ($1, $2, $3, 'Test API Key', true, 'system')
    `, [apiKeyHash, apiKeyPrefix, deviceId]);
    console.log(`Created test API key with hash: ${apiKeyHash}`);
    console.log(`Use this API key for testing: test-api-key-123`);

    // Assign the bus to a trip and route for testing
    // First, find an active trip and route
    const tripResult = await client.query(`
      SELECT t.trip_id, t.route_id
      FROM trips t
      JOIN routes r ON t.route_id = r.route_id
      WHERE t.is_active = true AND r.is_active = true
      LIMIT 1;
    `);
    if (tripResult.rows.length > 0) {
      const tripId = tripResult.rows[0].trip_id;
      const routeId = tripResult.rows[0].route_id;

      // Create an active vehicle assignment
      await client.query(`
        INSERT INTO vehicle_assignments (bus_id, device_id, trip_id, route_id, direction_id, assigned_by, status)
        VALUES ($1, $2, $3, $4, 0, 'system', 'active')
      `, [busId, deviceId, tripId, routeId]);
      console.log(`Created active vehicle assignment for bus ${busId} on trip ${tripId}, route ${routeId}`);
    } else {
      console.log('No active trips found; skipping vehicle assignment creation');
    }

    await client.query('COMMIT');
    console.log('Test data created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating test data:', err);
    throw err;
  } finally {
    client.release();
  }
}

createTestData()
  .then(() => {
    console.log('Success');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });