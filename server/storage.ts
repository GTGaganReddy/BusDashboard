import { 
  drivers, 
  routes, 
  assignments, 
  type Driver, 
  type Route, 
  type Assignment,
  type InsertDriver, 
  type InsertRoute, 
  type InsertAssignment,
  type RouteAssignmentView
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Driver operations
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  
  // Route operations
  getRoutes(): Promise<Route[]>;
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  
  // Assignment operations
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<RouteAssignmentView[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Batch operations
  createBulkAssignments(assignments: InsertAssignment[]): Promise<Assignment[]>;
}

// MemStorage removed - using DatabaseStorage only

export class DatabaseStorage implements IStorage {
  async getDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriver(id: number, insertDriver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set(insertDriver)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async getRoutes(): Promise<Route[]> {
    return await db.select().from(routes);
  }

  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route || undefined;
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const [route] = await db
      .insert(routes)
      .values(insertRoute)
      .returning();
    return route;
  }

  async getAssignments(): Promise<Assignment[]> {
    return await db.select().from(assignments);
  }

  async getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<RouteAssignmentView[]> {
    const result = await db
      .select()
      .from(assignments)
      .where(
        and(
          gte(assignments.assignedDate, startDate),
          lte(assignments.assignedDate, endDate)
        )
      );

    return result.map(row => ({
      id: row.id,
      routeNumber: row.routeNumber || "",
      routeDescription: row.routeDescription || "",
      routeHours: row.routeHours || "0",
      driverId: row.driverId,
      driverName: row.driverName,
      driverCode: "", // Not needed anymore
      hoursRemaining: row.driverHoursRemaining,
      status: row.status,
      assignedDate: row.assignedDate.toISOString(),
    }));
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db
      .insert(assignments)
      .values({
        ...insertAssignment,
        routeId: null, // Not using related tables anymore
        driverId: null  // Not using related tables anymore
      })
      .returning();
    return assignment;
  }

  async updateAssignment(id: number, insertAssignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db
      .update(assignments)
      .set(insertAssignment)
      .where(eq(assignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db
      .delete(assignments)
      .where(eq(assignments.id, id))
      .returning();
    return result.length > 0;
  }

  async createBulkAssignments(insertAssignments: InsertAssignment[]): Promise<Assignment[]> {
    const assignmentsWithNulls = insertAssignments.map(assignment => ({
      ...assignment,
      routeId: null, // Not using related tables anymore
      driverId: null  // Not using related tables anymore
    }));
    
    const results = await db
      .insert(assignments)
      .values(assignmentsWithNulls)
      .returning();
    return results;
  }
}

export const storage = new DatabaseStorage();
