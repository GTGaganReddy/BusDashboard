-- Restore database tables and May 1st assignment data

-- Create tables
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  monthly_hours_total DECIMAL(5,2) NOT NULL DEFAULT 160,
  monthly_hours_remaining DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  route_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  hours_required DECIMAL(4,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  driver_id INTEGER REFERENCES drivers(id),
  assigned_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  driver_name TEXT,
  route_number TEXT,
  route_description TEXT,
  route_hours DECIMAL(4,2),
  driver_hours_remaining DECIMAL(5,2)
);

-- Insert sample drivers (based on previous data)
INSERT INTO drivers (name, code, monthly_hours_total, monthly_hours_remaining, status) VALUES
  ('Lenker 1', 'LENKER1', 174.00, 174.00, 'active'),
  ('Lenker 2', 'LENKER2', 155.00, 155.00, 'active'),
  ('Lenker 3', 'LENKER3', 174.00, 174.00, 'active'),
  ('Lenker 4', 'LENKER4', 174.00, 174.00, 'active'),
  ('Lenker 5', 'LENKER5', 174.00, 174.00, 'active'),
  ('Lenker 6', 'LENKER6', 174.00, 174.00, 'active'),
  ('Lenker 7', 'LENKER7', 174.00, 174.00, 'active'),
  ('Lenker 8', 'LENKER8', 174.00, 174.00, 'active'),
  ('Lenker 9', 'LENKER9', 174.00, 174.00, 'active'),
  ('Lenker 10', 'LENKER10', 174.00, 174.00, 'active'),
  ('Lenker 11', 'LENKER11', 174.00, 174.00, 'active'),
  ('Lenker 12', 'LENKER12', 174.00, 174.00, 'active'),
  ('Lenker 13', 'LENKER13', 174.00, 174.00, 'active'),
  ('Lenker 14', 'LENKER14', 174.00, 174.00, 'active'),
  ('Lenker 15', 'LENKER15', 174.00, 174.00, 'active'),
  ('Lenker 16', 'LENKER16', 40.00, 40.00, 'active'),
  ('Lenker 17', 'LENKER17', 40.00, 40.00, 'active'),
  ('Lenker 18', 'LENKER18', 174.00, 174.00, 'active'),
  ('Lenker 19', 'LENKER19', 100.00, 100.00, 'active'),
  ('Klagenfurt - Fahrer', 'KLAGENFU', 66.00, 66.00, 'active'),
  ('Klagenfurt - Samstagsfahrer', 'KLAGEN-S', 40.00, 40.00, 'active')
ON CONFLICT (code) DO NOTHING;

-- Insert sample routes
INSERT INTO routes (route_number, description, hours_required) VALUES
  ('RT-001', 'Downtown Circuit', 11.00),
  ('RT-002', 'Airport Express', 12.00),
  ('RT-003', 'Mall Connection', 10.00),
  ('RT-004', 'University Route', 9.00),
  ('RT-005', 'Industrial Zone', 8.00)
ON CONFLICT (route_number) DO NOTHING;

-- Insert May 1st assignments (based on previous data)
INSERT INTO assignments (
  assigned_date, 
  driver_name, 
  route_number, 
  route_description, 
  route_hours, 
  driver_hours_remaining, 
  status
) VALUES
  ('2025-05-01', 'Lenker 3', 'RT-001', 'Downtown Circuit', 11.00, 163.00, 'assigned'),
  ('2025-05-01', 'Lenker 4', 'RT-002', 'Airport Express', 11.00, 163.00, 'assigned'),
  ('2025-05-01', 'Lenker 5', 'RT-003', 'Mall Connection', 11.00, 163.00, 'assigned'),
  ('2025-05-01', 'Lenker 6', 'RT-004', 'University Route', 12.00, 162.00, 'assigned'),
  ('2025-05-01', 'Lenker 7', 'RT-005', 'Industrial Zone', 10.00, 164.00, 'assigned')
ON CONFLICT DO NOTHING;