-- AddisTransit Database Schema
-- PostgreSQL 15+ with PostGIS 3.3+
-- Production-ready schema with proper constraints, indexes, and relationships
-- Version: 1.0.0

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GTFS Core Tables
-- ============================================================

-- 1. agency
-- Transit agencies operating the services
CREATE TABLE IF NOT EXISTS agency (
  agency_id VARCHAR(50) PRIMARY KEY,
  agency_name VARCHAR(255) NOT NULL,
  agency_url VARCHAR(255) NOT NULL,
  agency_timezone VARCHAR(50) NOT NULL,
  agency_lang VARCHAR(10),
  agency_phone VARCHAR(50),
  agency_fare_url VARCHAR(255),
  agency_email VARCHAR(255),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agency_id ON agency (agency_id);

-- 2. routes
-- Public transit routes
CREATE TABLE IF NOT EXISTS routes (
  route_id VARCHAR(50) PRIMARY KEY,
  agency_id VARCHAR(50) REFERENCES agency(agency_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  route_short_name VARCHAR(50),
  route_long_name VARCHAR(255) NOT NULL,
  route_type INTEGER NOT NULL CHECK (route_type IN (0, 1, 2, 3, 4, 5, 6, 7)),
  route_desc TEXT,
  route_url VARCHAR(255),
  route_color VARCHAR(7) CHECK (route_color ~ '^#[0-9A-Fa-f]{6}$'),
  route_text_color VARCHAR(7) CHECK (route_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  route_sort_order INTEGER,
  continuous_pickup INTEGER DEFAULT 0 CHECK (continuous_pickup IN (0, 1, 2, 3)),
  continuous_drop_off INTEGER DEFAULT 0 CHECK (continuous_drop_off IN (0, 1, 2, 3)),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_routes_agency ON routes (agency_id);
CREATE INDEX idx_routes_type ON routes (route_type);
CREATE INDEX idx_routes_active ON routes (is_active);
CREATE INDEX idx_routes_name ON routes (route_long_name, route_short_name);

-- 3. stops
-- Locations where vehicles pick up or drop off passengers
CREATE TABLE IF NOT EXISTS stops (
  stop_id VARCHAR(50) PRIMARY KEY,
  stop_code VARCHAR(50),
  stop_name VARCHAR(255) NOT NULL,
  stop_lat DECIMAL(10, 8) NOT NULL,
  stop_lon DECIMAL(11, 8) NOT NULL,
  stop_url VARCHAR(255),
  location_type INTEGER DEFAULT 0 CHECK (location_type IN (0, 1, 2, 3, 4)),
  parent_station VARCHAR(50) REFERENCES stops(stop_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  stop_timezone VARCHAR(50),
  wheelchair_boarding INTEGER DEFAULT 0 CHECK (wheelchair_boarding IN (0, 1, 2)),
  level_id VARCHAR(50),
  platform_code VARCHAR(50),
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stops_lat_lon ON stops (stop_lat, stop_lon);
CREATE INDEX idx_stops_parent ON stops (parent_station);
CREATE INDEX idx_stops_location_type ON stops (location_type);
CREATE INDEX idx_stops_geom ON stops USING GIST (geom);
CREATE INDEX idx_stops_name ON stops (stop_name);

-- 4. calendar
-- Service dates for routes
CREATE TABLE IF NOT EXISTS calendar (
  service_id VARCHAR(50) PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monday BOOLEAN DEFAULT FALSE,
  tuesday BOOLEAN DEFAULT FALSE,
  wednesday BOOLEAN DEFAULT FALSE,
  thursday BOOLEAN DEFAULT FALSE,
  friday BOOLEAN DEFAULT FALSE,
  saturday BOOLEAN DEFAULT FALSE,
  sunday BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_calendar_dates ON calendar (start_date, end_date);

-- 5. calendar_dates
-- Exception service dates
CREATE TABLE IF NOT EXISTS calendar_dates (
  service_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  exception_type INTEGER NOT NULL CHECK (exception_type IN (1, 2)),
  PRIMARY KEY (service_id, date),
  FOREIGN KEY (service_id) REFERENCES calendar(service_id) ON DELETE CASCADE
);

CREATE INDEX idx_calendar_dates_date ON calendar_dates (date);

-- 6. trips
-- Individual trips that vehicles make
CREATE TABLE IF NOT EXISTS trips (
  trip_id VARCHAR(50) PRIMARY KEY,
  route_id VARCHAR(50) NOT NULL REFERENCES routes(route_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  service_id VARCHAR(50) NOT NULL REFERENCES calendar(service_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  trip_headsign VARCHAR(255),
  trip_short_name VARCHAR(100),
  direction_id INTEGER CHECK (direction_id IN (0, 1)),
  block_id VARCHAR(50),
  shape_id VARCHAR(50),
  wheelchair_accessible INTEGER DEFAULT 0 CHECK (wheelchair_accessible IN (0, 1, 2)),
  bikes_allowed INTEGER DEFAULT 0 CHECK (bikes_allowed IN (0, 1, 2)),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trips_route ON trips (route_id);
CREATE INDEX idx_trips_service ON trips (service_id);
CREATE INDEX idx_trips_direction ON trips (direction_id);
CREATE INDEX idx_trips_block ON trips (block_id);
CREATE INDEX idx_trips_active ON trips (is_active);

-- 7. stop_times
-- Times that a vehicle arrives at and departs from stops
CREATE TABLE IF NOT EXISTS stop_times (
  trip_id VARCHAR(50) NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE ON UPDATE CASCADE,
  arrival_time TIME NOT NULL,
  departure_time TIME NOT NULL,
  stop_id VARCHAR(50) NOT NULL REFERENCES stops(stop_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  stop_sequence INTEGER NOT NULL,
  stop_headsign VARCHAR(255),
  pickup_type INTEGER DEFAULT 0 CHECK (pickup_type IN (0, 1, 2, 3)),
  drop_off_type INTEGER DEFAULT 0 CHECK (drop_off_type IN (0, 1, 2, 3)),
  continuous_pickup INTEGER DEFAULT 0 CHECK (continuous_pickup IN (0, 1, 2, 3)),
  continuous_drop_off INTEGER DEFAULT 0 CHECK (continuous_drop_off IN (0, 1, 2, 3)),
  shape_dist_traveled DECIMAL(10, 4),
  timepoint BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (trip_id, stop_sequence)
);

CREATE INDEX idx_stop_times_stop ON stop_times (stop_id);
CREATE INDEX idx_stop_times_trip ON stop_times (trip_id);
CREATE INDEX idx_stop_times_arrival ON stop_times (arrival_time);
CREATE INDEX idx_stop_times_departure ON stop_times (departure_time);

-- 8. frequencies
-- Frequency-based service (headway-based)
CREATE TABLE IF NOT EXISTS frequencies (
  trip_id VARCHAR(50) NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE ON UPDATE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  headway_secs INTEGER NOT NULL,
  exact_times BOOLEAN DEFAULT FALSE,
  CHECK (end_time > start_time)
);

CREATE INDEX idx_frequencies_trip ON frequencies (trip_id);
CREATE INDEX idx_frequencies_time ON frequencies (start_time, end_time);

-- 9. shapes (EXCLUDED FROM GTFS LOADER - Optional manual import)
-- Geographic paths for routes
CREATE TABLE IF NOT EXISTS shapes (
  shape_id VARCHAR(50) NOT NULL,
  shape_pt_lat DECIMAL(10, 8) NOT NULL,
  shape_pt_lon DECIMAL(11, 8) NOT NULL,
  shape_pt_sequence INTEGER NOT NULL,
  shape_dist_traveled DECIMAL(10, 4),
  geom GEOMETRY(Point, 4326),
  PRIMARY KEY (shape_id, shape_pt_sequence)
);

CREATE INDEX idx_shapes_id ON shapes (shape_id);
CREATE INDEX idx_shapes_geom ON shapes USING GIST (geom);

-- 10. feed_info
-- Information about the feed
CREATE TABLE IF NOT EXISTS feed_info (
  feed_publisher_name VARCHAR(255),
  feed_publisher_url VARCHAR(255),
  feed_lang VARCHAR(10),
  feed_start_date DATE,
  feed_end_date DATE,
  feed_version VARCHAR(50),
  feed_contact_email VARCHAR(255),
  feed_contact_url VARCHAR(255)
);

-- ============================================================
-- Buses and Vehicle Management Tables
-- ============================================================

-- 11. buses
-- Physical bus assets (long-lived entities)
CREATE TABLE IF NOT EXISTS buses (
  bus_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_number VARCHAR(50) UNIQUE NOT NULL,  -- Fleet/registration number
  license_plate VARCHAR(50) UNIQUE,
  bus_model VARCHAR(100),
  capacity INTEGER DEFAULT 50 CHECK (capacity > 0),
  year INTEGER CHECK (year BETWEEN 1990 AND EXTRACT(YEAR FROM NOW()) + 1),
  agency_id VARCHAR(50) NOT NULL REFERENCES agency(agency_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  commission_date DATE,
  last_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buses_agency ON buses (agency_id);
CREATE INDEX idx_buses_number ON buses (bus_number);
CREATE INDEX idx_buses_plate ON buses (license_plate);
CREATE INDEX idx_buses_active ON buses (is_active);

-- 12. gps_devices
-- GPS tracking devices installed on buses
CREATE TABLE IF NOT EXISTS gps_devices (
  device_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name VARCHAR(100),
  device_type VARCHAR(50) DEFAULT 'tracker',
  device_model VARCHAR(100),
  serial_number VARCHAR(100),
  bus_id UUID UNIQUE REFERENCES buses(bus_id) ON DELETE SET NULL ON UPDATE CASCADE,
  firmware_version VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  installation_date DATE,
  last_online_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gps_devices_bus ON gps_devices (bus_id);
CREATE INDEX idx_gps_devices_active ON gps_devices (is_active);
CREATE INDEX idx_gps_devices_serial ON gps_devices (serial_number);

-- 13. api_keys
-- API keys for device authentication (GPS devices)
CREATE TABLE IF NOT EXISTS api_keys (
  key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,  -- SHA-256 hash of the actual key
  api_key_prefix VARCHAR(10) NOT NULL,  -- First 10 chars for identification (not secret)
  device_id UUID NOT NULL REFERENCES gps_devices(device_id) ON DELETE CASCADE ON UPDATE CASCADE,
  key_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  last_used_at TIMESTAMP WITHOUT TIME ZONE,
  created_by VARCHAR(50),  -- Admin user ID
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE INDEX idx_api_keys_device ON api_keys (device_id);
CREATE INDEX idx_api_keys_hash ON api_keys (api_key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys (api_key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys (is_active, expires_at);

-- 14. vehicle_assignments
-- Runtime assignment of buses to trips/routes
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE ON UPDATE CASCADE,
  device_id UUID NOT NULL REFERENCES gps_devices(device_id) ON DELETE CASCADE ON UPDATE CASCADE,
  trip_id VARCHAR(50) REFERENCES trips(trip_id) ON DELETE SET NULL ON UPDATE CASCADE,
  route_id VARCHAR(50) NOT NULL REFERENCES routes(route_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  direction_id INTEGER CHECK (direction_id IN (0, 1)),
  start_stop_id VARCHAR(50) REFERENCES stops(stop_id) ON DELETE SET NULL ON UPDATE CASCADE,
  end_stop_id VARCHAR(50) REFERENCES stops(stop_id) ON DELETE SET NULL ON UPDATE CASCADE,
  assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITHOUT TIME ZONE,
  assigned_by VARCHAR(50),  -- Admin user ID or 'system'
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'break')),
  notes TEXT,
  CONSTRAINT assignment_dates_valid CHECK (unassigned_at IS NULL OR unassigned_at > assigned_at)
);

CREATE INDEX idx_assignments_bus ON vehicle_assignments (bus_id, assigned_at DESC);
CREATE INDEX idx_assignments_device ON vehicle_assignments (device_id, assigned_at DESC);
CREATE INDEX idx_assignments_trip ON vehicle_assignments (trip_id, assigned_at DESC);
CREATE INDEX idx_assignments_route ON vehicle_assignments (route_id, assigned_at DESC);
CREATE INDEX idx_assignments_status ON vehicle_assignments (status, assigned_at DESC);
CREATE INDEX idx_assignments_active ON vehicle_assignments (bus_id) WHERE status = 'active';

-- 15. vehicle_positions
-- Historical GPS positions (PARTITIONED by month)
CREATE TABLE IF NOT EXISTS vehicle_positions (
  id BIGSERIAL,
  device_id UUID NOT NULL REFERENCES gps_devices(device_id) ON DELETE CASCADE ON UPDATE CASCADE,
  bus_id UUID REFERENCES buses(bus_id) ON DELETE SET NULL ON UPDATE CASCADE,
  trip_id VARCHAR(50) REFERENCES trips(trip_id) ON DELETE SET NULL ON UPDATE CASCADE,
  route_id VARCHAR(50) REFERENCES routes(route_id) ON DELETE SET NULL ON UPDATE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  accuracy DECIMAL(5, 2),
  passengers_onboard INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,  -- Timestamp from GPS device
  received_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),  -- Timestamp when server received
  is_valid BOOLEAN DEFAULT TRUE,
  validation_reason VARCHAR(255),
  geom GEOMETRY(Point, 4326)
) PARTITION BY RANGE (received_at);

-- Create partition for current month (example: February 2024)
-- Run these partition creation scripts monthly
CREATE TABLE IF NOT EXISTS vehicle_positions_2024_02 PARTITION OF vehicle_positions
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE IF NOT EXISTS vehicle_positions_2024_03 PARTITION OF vehicle_positions
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE INDEX idx_vehicle_positions_device ON vehicle_positions (device_id, received_at DESC);
CREATE INDEX idx_vehicle_positions_bus ON vehicle_positions (bus_id, received_at DESC);
CREATE INDEX idx_vehicle_positions_trip ON vehicle_positions (trip_id, received_at DESC);
CREATE INDEX idx_vehicle_positions_route ON vehicle_positions (route_id, received_at DESC);
CREATE INDEX idx_vehicle_positions_received ON vehicle_positions (received_at DESC);
CREATE INDEX idx_vehicle_positions_geom ON vehicle_positions USING GIST (geom);

-- 16. gps_validation_events
-- GPS position validation events for audit and debugging
CREATE TABLE IF NOT EXISTS gps_validation_events (
  event_id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES gps_devices(device_id) ON DELETE SET NULL ON UPDATE CASCADE,
  bus_id UUID REFERENCES buses(bus_id) ON DELETE SET NULL ON UPDATE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMP WITHOUT TIME ZONE,
  validation_result VARCHAR(20) NOT NULL CHECK (validation_result IN ('accepted', 'rejected', 'flagged')),
  rejection_reason VARCHAR(255),
  speed_kmh DECIMAL(5, 2),
  distance_km DECIMAL(10, 4),
  time_diff_seconds INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_validation_events_device ON gps_validation_events (device_id, created_at DESC);
CREATE INDEX idx_validation_events_bus ON gps_validation_events (bus_id, created_at DESC);
CREATE INDEX idx_validation_events_result ON gps_validation_events (validation_result, created_at DESC);

-- ============================================================
-- Admin and Import Management Tables
-- ============================================================

-- 17. admin_users
-- Administrators with access to management APIs
CREATE TABLE IF NOT EXISTS admin_users (
  user_id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users (email);
CREATE INDEX idx_admin_users_role ON admin_users (role, is_active);

-- 18. import_history
-- GTFS import tracking
CREATE TABLE IF NOT EXISTS import_history (
  import_id SERIAL PRIMARY KEY,
  import_type VARCHAR(50) NOT NULL DEFAULT 'gtfs' CHECK (import_type IN ('gtfs', 'partial', 'manual')),
  started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  version VARCHAR(50),
  source_file_path TEXT,
  checksum VARCHAR(64),
  error_message TEXT,
  imported_by VARCHAR(50) REFERENCES admin_users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT import_time_valid CHECK (completed_at IS NULL OR completed_at > started_at)
);

CREATE INDEX idx_import_history_status ON import_history (status, started_at DESC);
CREATE INDEX idx_import_history_type ON import_history (import_type, started_at DESC);
CREATE INDEX idx_import_history_imported_by ON import_history (imported_by, started_at DESC);

-- ============================================================
-- Performance Views
-- ============================================================

-- View: Active buses with current position
CREATE OR REPLACE VIEW v_active_buses AS
SELECT
  b.bus_id,
  b.bus_number,
  b.license_plate,
  b.bus_model,
  b.capacity,
  b.agency_id,
  a.agency_name,
  vd.device_id,
  vd.device_name,
  va.trip_id,
  va.route_id,
  r.route_short_name,
  r.route_long_name,
  t.trip_headsign,
  vp.latitude,
  vp.longitude,
  vp.heading,
  vp.speed,
  vp.passengers_onboard,
  vp.recorded_at AS last_position_time,
  va.assigned_at AS assignment_time,
  CASE
    WHEN vp.received_at > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN vp.received_at > NOW() - INTERVAL '30 minutes' THEN 'recently_online'
    ELSE 'offline'
  END AS connectivity_status
FROM buses b
LEFT JOIN agency a ON b.agency_id = a.agency_id
LEFT JOIN gps_devices vd ON b.bus_id = vd.bus_id AND vd.is_active = TRUE
LEFT JOIN vehicle_assignments va ON b.bus_id = va.bus_id AND va.status = 'active'
LEFT JOIN routes r ON va.route_id = r.route_id
LEFT JOIN trips t ON va.trip_id = t.trip_id
LEFT JOIN LATERAL (
  SELECT *
  FROM vehicle_positions
  WHERE device_id = vd.device_id
  ORDER BY received_at DESC
  LIMIT 1
) vp ON TRUE
WHERE b.is_active = TRUE
  AND vd.is_active = TRUE;

-- View: Stop schedules with route information
CREATE OR REPLACE VIEW v_stop_schedules AS
SELECT
  st.stop_id,
  s.stop_name,
  s.stop_lat,
  s.stop_lon,
  t.trip_id,
  t.route_id,
  r.route_short_name,
  r.route_long_name,
  t.direction_id,
  t.trip_headsign,
  st.arrival_time,
  st.departure_time,
  st.stop_sequence,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM vehicle_assignments va
      WHERE va.trip_id = st.trip_id
      AND va.status = 'active'
    ) THEN TRUE
    ELSE FALSE
  END AS has_active_vehicle
FROM stop_times st
JOIN stops s ON st.stop_id = s.stop_id
JOIN trips t ON st.trip_id = t.trip_id
JOIN routes r ON t.route_id = r.route_id
WHERE t.is_active = TRUE
ORDER BY st.arrival_time;

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function: Generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(64) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || SUBSTR(chars, (random() * 61 + 1)::INT, 1);
  END LOOP;
  RETURN 'at_' || result;  -- 'at_' prefix for AddisTransit
END;
$$ LANGUAGE plpgsql;

-- Function: Hash API key
CREATE OR REPLACE FUNCTION hash_api_key(key VARCHAR)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(digest(key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Triggers for Updated At
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER agency_updated_at BEFORE UPDATE ON agency
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER routes_updated_at BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stops_updated_at BEFORE UPDATE ON stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER buses_updated_at BEFORE UPDATE ON buses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gps_devices_updated_at BEFORE UPDATE ON gps_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON DATABASE addistransit IS 'AddisTransit Database - Production Schema v1.0.0';

COMMENT ON TABLE agency IS 'Transit agencies operating the services (GTFS)';
COMMENT ON TABLE routes IS 'Public transit routes (GTFS)';
COMMENT ON TABLE stops IS 'Locations where vehicles pick up or drop off passengers (GTFS)';
COMMENT ON TABLE calendar IS 'Service dates for routes (GTFS)';
COMMENT ON TABLE calendar_dates IS 'Exception service dates (GTFS)';
COMMENT ON TABLE trips IS 'Individual trips that vehicles make (GTFS)';
COMMENT ON TABLE stop_times IS 'Times that vehicles arrive at and depart from stops (GTFS)';
COMMENT ON TABLE frequencies IS 'Frequency-based service (GTFS)';
COMMENT ON TABLE shapes IS 'Geographic paths for routes (GTFS) - Optional, excluded from loader';

COMMENT ON TABLE buses IS 'Physical bus assets (long-lived entities)';
COMMENT ON TABLE gps_devices IS 'GPS tracking devices installed on buses';
COMMENT ON TABLE api_keys IS 'API keys for device authentication (GPS devices)';
COMMENT ON TABLE vehicle_assignments IS 'Runtime assignment of buses to trips/routes';
COMMENT ON TABLE vehicle_positions IS 'Historical GPS positions (partitioned by month)';
COMMENT ON TABLE gps_validation_events IS 'GPS position validation events for audit';

COMMENT ON TABLE admin_users IS 'Administrators with access to management APIs';
COMMENT ON TABLE import_history IS 'GTFS import tracking';

COMMENT ON FUNCTION generate_api_key() IS 'Generate a 64-character API key with ''at_'' prefix';
COMMENT ON FUNCTION hash_api_key(VARCHAR) IS 'Hash an API key using SHA-256';

-- ============================================================
-- End of Schema
-- ============================================================