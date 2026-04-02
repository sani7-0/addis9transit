import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateApiKeyHash() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the test bus ID
    const busResult = await client.query(
      'SELECT bus_id FROM buses WHERE bus_number = $1',
      ['TEST001']
    );
    if (busResult.rows.length === 0) {
      throw new Error('Test bus not found');
    }
    const busId = busResult.rows[0].bus_id;

    // Get the device ID for that bus
    const deviceResult = await client.query(
      'SELECT device_id FROM gps_devices WHERE bus_id = $1',
      [busId]
    );
    if (deviceResult.rows.length === 0) {
      throw new Error('GPS device not found for test bus');
    }
    const deviceId = deviceResult.rows[0].device_id;

    // Compute hash of test-api-key-123
    const apiKey = 'test-api-key-123';
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    // Update the API key hash
    const updateResult = await client.query(
      'UPDATE api_keys SET api_key_hash = $1 WHERE device_id = $2',
      [apiKeyHash, deviceId]
    );

    console.log(`Updated ${updateResult.rowCount} API key record(s)`);

    // Verify
    const verifyResult = await client.query(
      'SELECT api_key_hash, api_key_prefix FROM api_keys WHERE device_id = $1',
      [deviceId]
    );
    console.log('Stored hash:', verifyResult.rows[0].api_key_hash);
    console.log('Expected hash:', apiKeyHash);
    console.log('Match:', verifyResult.rows[0].api_key_hash === apiKeyHash);

    await client.query('COMMIT');
    console.log('API key hash updated successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating API key hash:', err);
    throw err;
  } finally {
    client.release();
  }
}

updateApiKeyHash()
  .then(() => {
    console.log('Success');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });