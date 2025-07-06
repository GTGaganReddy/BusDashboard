import { db } from './db';
import { drivers, routes, assignments } from '@shared/schema';
import { sql } from 'drizzle-orm';

export async function setupPermanentDatabase() {
  try {
    console.log('Setting up permanent database tables...');
    
    // Create tables using raw SQL to ensure they exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        monthly_hours_total DECIMAL(5,2) NOT NULL DEFAULT 160,
        monthly_hours_remaining DECIMAL(5,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        route_number TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        hours_required DECIMAL(4,2) NOT NULL
      )
    `);
    
    await db.execute(sql`
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
      )
    `);
    
    console.log('Tables created successfully!');
    
    // Check if data already exists
    const existingDrivers = await db.select().from(drivers).limit(1);
    if (existingDrivers.length > 0) {
      console.log('Database already contains data, skipping seed...');
      return;
    }
    
    console.log('Seeding database with permanent data...');
    
    // Insert drivers
    const driversData = [
      { name: 'Lenker 1', code: 'LENKER1', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 2', code: 'LENKER2', monthlyHoursTotal: '155.00', monthlyHoursRemaining: '155.00', status: 'active' },
      { name: 'Lenker 3', code: 'LENKER3', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 4', code: 'LENKER4', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 5', code: 'LENKER5', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 6', code: 'LENKER6', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 7', code: 'LENKER7', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 8', code: 'LENKER8', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 9', code: 'LENKER9', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 10', code: 'LENKER10', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 11', code: 'LENKER11', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 12', code: 'LENKER12', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 13', code: 'LENKER13', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 14', code: 'LENKER14', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 15', code: 'LENKER15', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 16', code: 'LENKER16', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' },
      { name: 'Lenker 17', code: 'LENKER17', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' },
      { name: 'Lenker 18', code: 'LENKER18', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { name: 'Lenker 19', code: 'LENKER19', monthlyHoursTotal: '100.00', monthlyHoursRemaining: '100.00', status: 'active' },
      { name: 'Klagenfurt - Fahrer', code: 'KLAGENFU', monthlyHoursTotal: '66.00', monthlyHoursRemaining: '66.00', status: 'active' },
      { name: 'Klagenfurt - Samstagsfahrer', code: 'KLAGEN-S', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' }
    ];
    
    await db.insert(drivers).values(driversData);
    console.log('✅ Drivers inserted successfully!');
    
    // Insert routes
    const routesData = [
      { routeNumber: 'RT-001', description: 'Downtown Circuit', hoursRequired: '11.00' },
      { routeNumber: 'RT-002', description: 'Airport Express', hoursRequired: '12.00' },
      { routeNumber: 'RT-003', description: 'Mall Connection', hoursRequired: '10.00' },
      { routeNumber: 'RT-004', description: 'University Route', hoursRequired: '9.00' },
      { routeNumber: 'RT-005', description: 'Industrial Zone', hoursRequired: '8.00' }
    ];
    
    await db.insert(routes).values(routesData);
    console.log('✅ Routes inserted successfully!');
    
    // Insert May 1st assignments
    const assignmentsData = [
      {
        assignedDate: new Date('2025-05-01'),
        status: 'assigned',
        driverName: 'Lenker 3',
        routeNumber: 'RT-001',
        routeDescription: 'Downtown Circuit',
        routeHours: '11.00',
        driverHoursRemaining: '163.00'
      },
      {
        assignedDate: new Date('2025-05-01'),
        status: 'assigned',
        driverName: 'Lenker 4',
        routeNumber: 'RT-002',
        routeDescription: 'Airport Express',
        routeHours: '11.00',
        driverHoursRemaining: '163.00'
      },
      {
        assignedDate: new Date('2025-05-01'),
        status: 'assigned',
        driverName: 'Lenker 5',
        routeNumber: 'RT-003',
        routeDescription: 'Mall Connection',
        routeHours: '11.00',
        driverHoursRemaining: '163.00'
      },
      {
        assignedDate: new Date('2025-05-01'),
        status: 'assigned',
        driverName: 'Lenker 6',
        routeNumber: 'RT-004',
        routeDescription: 'University Route',
        routeHours: '12.00',
        driverHoursRemaining: '162.00'
      },
      {
        assignedDate: new Date('2025-05-01'),
        status: 'assigned',
        driverName: 'Lenker 7',
        routeNumber: 'RT-005',
        routeDescription: 'Industrial Zone',
        routeHours: '10.00',
        driverHoursRemaining: '164.00'
      }
    ];
    
    await db.insert(assignments).values(assignmentsData);
    console.log('✅ May 1st assignments inserted successfully!');
    
    console.log('🎉 Permanent database setup completed!');
    console.log('- 21 drivers with correct monthly hours');
    console.log('- 5 routes');
    console.log('- 5 May 1st assignments with accurate remaining hours');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}