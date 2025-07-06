import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use Replit's built-in PostgreSQL database
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'main',
  user: 'replit',
  password: '',
  ssl: false
});

export const db = drizzle(pool, { schema });
export { pool };