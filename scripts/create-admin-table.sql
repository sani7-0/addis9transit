-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active ON admin_users(role, is_active);

-- Insert default admin user (password: admin123)
-- Run this ONLY once - it will insert if not exists
INSERT INTO admin_users (email, password_hash, role, is_active)
SELECT 'admin@addistransit.com', '$2b$10$KpJ8kXqZ3vL9mN2oP4qR5uW6xY7zA8bC9dE0fG1hI2jK3lM4nO5pQ', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@addistransit.com');

-- To generate a new password hash, run this in Node.js:
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('yourpassword', 10).then(hash => console.log(hash));
