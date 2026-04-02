#!/usr/bin/env node

/**
 * Assign unique colors to routes
 */

require('dotenv').config();
const { Pool } = require('pg');

const ROUTE_COLORS = [
  'E53935', // Red
  '1E88E5', // Blue  
  '43A047', // Green
  'FB8C00', // Orange
  '8E24AA', // Purple
  '00ACC1', // Cyan
  'FFB300', // Amber
  '6D4C41', // Brown
  '546E7A', // Blue Grey
  'D81B60', // Pink
  '3949AB', // Indigo
  '00897B', // Teal
  '7CB342', // Light Green
  'F4511E', // Deep Orange
  '5E35B1', // Deep Purple
  '039BE5', // Light Blue
];

async function fixColors() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Get all routes
    const { rows: routes } = await client.query('SELECT route_id FROM routes ORDER BY route_id');
    console.log(`Found ${routes.length} routes`);

    // Update each route with a unique color
    for (let i = 0; i < routes.length; i++) {
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      await client.query(
        'UPDATE routes SET route_color = $1 WHERE route_id = $2',
        [color, routes[i].route_id]
      );
      console.log(`  Updated route ${routes[i].route_id} with color ${color}`);
    }

    console.log('\nDone! All routes now have unique colors.');
    client.release();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixColors();
