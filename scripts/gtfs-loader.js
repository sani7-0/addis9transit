#!/usr/bin/env node

/**
 * AddisTransit GTFS Loader
 *
 * - Loads GTFS data into Supabase PostgreSQL
 * - Includes shapes.txt for route line rendering
 * - Order-aware and transactional
 * - Truncate + reload (safe + deterministic)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');

const ROOT_DIR = path.join(__dirname, '..', '..');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000', 10);

const TABLE_ORDER = [
  'agency',
  'routes',
  'stops',
  'calendar',
  'calendar_dates',
  'shapes',
  'trips',
  'stop_times',
  'frequencies',
];

const TABLE_COLUMNS = {
  agency: [
    'agency_id',
    'agency_name',
    'agency_url',
    'agency_timezone',
    'agency_lang',
    'agency_phone',
  ],
  routes: [
    'route_id',
    'agency_id',
    'route_short_name',
    'route_long_name',
    'route_type',
    'route_desc',
    'route_color',
    'route_text_color',
  ],
  stops: [
    'stop_id',
    'stop_name',
    'stop_lat',
    'stop_lon',
    'location_type',
    'parent_station',
  ],
  calendar: [
    'service_id',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'start_date',
    'end_date',
  ],
  calendar_dates: [
    'service_id',
    'date',
    'exception_type',
  ],
  shapes: [
    'shape_id',
    'shape_pt_lat',
    'shape_pt_lon',
    'shape_pt_sequence',
    'shape_dist_traveled',
  ],
  trips: [
    'trip_id',
    'route_id',
    'service_id',
    'shape_id',
    'direction_id',
    'trip_headsign',
  ],
  stop_times: [
    'trip_id',
    'arrival_time',
    'departure_time',
    'stop_id',
    'stop_sequence',
    'pickup_type',
    'drop_off_type',
    'timepoint',
  ],
  frequencies: [
    'trip_id',
    'start_time',
    'end_time',
    'headway_secs',
    'exact_times',
  ],
};

class GTFSLoader {
  async connect() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // loader only
      max: 20,
    });

    this.client = await this.pool.connect();
    console.log('Connected to database');
  }

  async disconnect() {
    await this.client.release();
    await this.pool.end();
  }

  async truncateTable(table) {
    console.log(`  Truncating ${table}`);
    await this.client.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  readFile(table) {
    const file = path.join(ROOT_DIR, `${table}.txt`);
    if (!fs.existsSync(file)) return [];

    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(file)
        .pipe(csv())
        .on('data', r => rows.push(r))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  normalizeRow(table, row) {
    const out = {};
    for (const col of TABLE_COLUMNS[table]) {
      let val = row[col];
      if (val === '' || val === undefined) val = null;

      if (['monday','tuesday','wednesday','thursday','friday','saturday','sunday','exact_times','timepoint'].includes(col)) {
        out[col] = val === null ? null : val === '1';
      } else if (['route_type','direction_id','stop_sequence','pickup_type','drop_off_type','headway_secs','exception_type','location_type','shape_pt_sequence'].includes(col)) {
        out[col] = val === null ? null : parseInt(val, 10);
      } else if (['stop_lat','stop_lon','shape_pt_lat','shape_pt_lon','shape_dist_traveled'].includes(col)) {
        out[col] = val === null ? null : parseFloat(val);
      } else if (['arrival_time','departure_time','start_time','end_time'].includes(col)) {
        out[col] = val;
      } else {
        out[col] = val;
      }
    }
    return out;
  }

  async insertBatch(table, rows) {
    if (!rows.length) return;

    const cols = TABLE_COLUMNS[table];
    const values = [];
    const placeholders = [];

    rows.forEach((row, rIdx) => {
      const base = rIdx * cols.length;
      placeholders.push(
        `(${cols.map((_, cIdx) => `$${base + cIdx + 1}`).join(',')})`
      );
      cols.forEach(c => values.push(row[c]));
    });

    const sql = `
      INSERT INTO ${table} (${cols.join(',')})
      VALUES ${placeholders.join(',')}
    `;

    await this.client.query(sql, values);
  }

  async importTable(table) {
    console.log(`\nImporting ${table}`);
    const raw = await this.readFile(table);
    if (!raw.length) return;

    await this.truncateTable(table);

    const rows = raw.map(r => this.normalizeRow(table, r));

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await this.insertBatch(table, batch);
      console.log(`  Inserted ${i + batch.length}/${rows.length}`);
    }
  }

  async run() {
    console.log('='.repeat(60));
    console.log('AddisTransit GTFS Loader');
    console.log('='.repeat(60));

    await this.connect();
    await this.client.query('BEGIN');

    try {
      for (const table of TABLE_ORDER) {
        await this.importTable(table);
      }
      await this.client.query('COMMIT');
      console.log('\nGTFS import completed successfully');
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    } finally {
      await this.disconnect();
    }
  }
}

if (require.main === module) {
  new GTFSLoader().run().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
