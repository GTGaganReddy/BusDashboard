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
  
  // Monthly tracking operations
  calculateMonthlyHours(driverName: string, year: number, month: number): Promise<{
    totalHours: number;
    hoursUsed: number;
    hoursRemaining: number;
  }>;
  updateDriverMonthlyHours(driverName: string, totalHours: number): Promise<void>;
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
    // Get the old assignment to check if driver changed
    const [oldAssignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    const [assignment] = await db
      .update(assignments)
      .set(insertAssignment)
      .where(eq(assignments.id, id))
      .returning();
    
    // If assignment was updated, check if we need to update driver hours
    if (assignment) {
      const driversToUpdate = new Set<string>();
      
      // If old assignment had a driver, update their hours
      if (oldAssignment?.driverName) {
        driversToUpdate.add(oldAssignment.driverName);
      }
      
      // If new assignment has a driver, update their hours
      if (assignment.driverName) {
        driversToUpdate.add(assignment.driverName);
      }
      
      // Update all affected drivers
      for (const driverName of Array.from(driversToUpdate)) {
        await this.updateDriverRemainingHours(driverName);
      }
      
      // Note: OR tools synchronization removed - system is now integrated
    }
    
    return assignment || undefined;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    // Get the assignment before deleting to know which driver to update
    const [assignmentToDelete] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);
    
    const result = await db
      .delete(assignments)
      .where(eq(assignments.id, id))
      .returning();
    
    const deleted = result.length > 0;
    
    // If assignment was deleted and had a driver, update their remaining hours
    if (deleted && assignmentToDelete?.driverName) {
      await this.updateDriverRemainingHours(assignmentToDelete.driverName);
      
      // Note: OR tools synchronization removed - system is now integrated
    }
    
    return deleted;
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
    
    // Update driver monthly hours after creating assignments
    for (const assignment of results) {
      if (assignment.driverName) {
        await this.updateDriverRemainingHours(assignment.driverName);
      }
    }
    
    // Note: OR tools synchronization removed - system is now integrated
    
    return results;
  }

  async calculateMonthlyHours(driverName: string, year: number, month: number): Promise<{
    totalHours: number;
    hoursUsed: number;
    hoursRemaining: number;
  }> {
    // Get driver's monthly total hours
    const [driver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.name, driverName))
      .limit(1);
    
    if (!driver) {
      return { totalHours: 0, hoursUsed: 0, hoursRemaining: 0 };
    }
    
    const totalHours = parseFloat(driver.monthlyHoursTotal || "0");
    
    // Calculate start and end of month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    
    // Get all assignments for this driver in the month
    const monthlyAssignments = await db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.driverName, driverName),
          gte(assignments.assignedDate, startOfMonth),
          lte(assignments.assignedDate, endOfMonth),
          eq(assignments.status, "assigned")
        )
      );
    
    // Sum up hours used
    const hoursUsed = monthlyAssignments.reduce((sum, assignment) => {
      return sum + parseFloat(assignment.routeHours || "0");
    }, 0);
    
    const hoursRemaining = Math.max(0, totalHours - hoursUsed);
    
    return {
      totalHours,
      hoursUsed,
      hoursRemaining
    };
  }

  async updateDriverMonthlyHours(driverName: string, totalHours: number): Promise<void> {
    // Create driver if doesn't exist
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.name, driverName))
      .limit(1);
    
    if (!existingDriver) {
      const code = driverName.replace(/\s+/g, '').substring(0, 8).toUpperCase();
      await db
        .insert(drivers)
        .values({
          name: driverName,
          code,
          monthlyHoursTotal: totalHours.toString(),
          monthlyHoursRemaining: totalHours.toString()
        });
    } else {
      await db
        .update(drivers)
        .set({ monthlyHoursTotal: totalHours.toString() })
        .where(eq(drivers.name, driverName));
    }
    
    // Update remaining hours
    await this.updateDriverRemainingHours(driverName);
  }

  private async updateDriverRemainingHours(driverName: string): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const monthlyData = await this.calculateMonthlyHours(driverName, currentYear, currentMonth);
    
    // Create driver if doesn't exist
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.name, driverName))
      .limit(1);
    
    if (!existingDriver) {
      const code = driverName.replace(/\s+/g, '').substring(0, 8).toUpperCase();
      await db
        .insert(drivers)
        .values({
          name: driverName,
          code,
          monthlyHoursTotal: "160", // Default monthly hours
          monthlyHoursRemaining: monthlyData.hoursRemaining.toString()
        });
    } else {
      await db
        .update(drivers)
        .set({ monthlyHoursRemaining: monthlyData.hoursRemaining.toString() })
        .where(eq(drivers.name, driverName));
    }
  }
}

export const storage = new DatabaseStorage();
