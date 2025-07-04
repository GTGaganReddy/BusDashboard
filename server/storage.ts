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

export class MemStorage implements IStorage {
  private drivers: Map<number, Driver>;
  private routes: Map<number, Route>;
  private assignments: Map<number, Assignment>;
  private currentDriverId: number;
  private currentRouteId: number;
  private currentAssignmentId: number;

  constructor() {
    this.drivers = new Map();
    this.routes = new Map();
    this.assignments = new Map();
    this.currentDriverId = 1;
    this.currentRouteId = 1;
    this.currentAssignmentId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample drivers
    const sampleDrivers = [
      { name: "John Mitchell", code: "DRV-001", monthlyHoursRemaining: "142.5", status: "active" },
      { name: "Sarah Johnson", code: "DRV-002", monthlyHoursRemaining: "18.2", status: "low" },
      { name: "Mike Rodriguez", code: "DRV-003", monthlyHoursRemaining: "89.3", status: "active" },
      { name: "Lisa Chen", code: "DRV-004", monthlyHoursRemaining: "3.1", status: "critical" },
      { name: "David Williams", code: "DRV-005", monthlyHoursRemaining: "156.8", status: "active" },
    ];

    // Sample routes
    const sampleRoutes = [
      { routeNumber: "RT-001", description: "Downtown Circuit", hoursRequired: "8.5" },
      { routeNumber: "RT-002", description: "Suburban Express", hoursRequired: "10.0" },
      { routeNumber: "RT-003", description: "Airport Shuttle", hoursRequired: "6.5" },
      { routeNumber: "RT-004", description: "Night Service", hoursRequired: "9.5" },
      { routeNumber: "RT-005", description: "Cross Town", hoursRequired: "7.0" },
    ];

    // Create sample drivers
    sampleDrivers.forEach(driver => {
      const id = this.currentDriverId++;
      this.drivers.set(id, { ...driver, id });
    });

    // Create sample routes
    sampleRoutes.forEach(route => {
      const id = this.currentRouteId++;
      this.routes.set(id, { ...route, id });
    });

    // Create sample assignments for current week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    const sampleAssignments = [
      { routeId: 1, driverId: 1, assignedDate: new Date(monday), status: "assigned" },
      { routeId: 2, driverId: 2, assignedDate: new Date(monday), status: "assigned" },
      { routeId: 3, driverId: null, assignedDate: new Date(monday), status: "unassigned" },
      { routeId: 4, driverId: 3, assignedDate: new Date(monday), status: "assigned" },
      { routeId: 5, driverId: 4, assignedDate: new Date(monday), status: "critical" },
    ];

    sampleAssignments.forEach(assignment => {
      const id = this.currentAssignmentId++;
      this.assignments.set(id, { ...assignment, id });
    });
  }

  async getDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values());
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = this.currentDriverId++;
    const driver: Driver = { 
      ...insertDriver, 
      id,
      status: insertDriver.status || "active"
    };
    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriver(id: number, insertDriver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const existing = this.drivers.get(id);
    if (!existing) return undefined;
    
    const updated: Driver = { ...existing, ...insertDriver };
    this.drivers.set(id, updated);
    return updated;
  }

  async getRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.currentRouteId++;
    const route: Route = { ...insertRoute, id };
    this.routes.set(id, route);
    return route;
  }

  async getAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values());
  }

  async getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<RouteAssignmentView[]> {
    const assignments = Array.from(this.assignments.values())
      .filter(a => a.assignedDate >= startDate && a.assignedDate <= endDate);
    
    return assignments.map(assignment => {
      const route = this.routes.get(assignment.routeId);
      const driver = assignment.driverId ? this.drivers.get(assignment.driverId) : null;
      
      return {
        id: assignment.id,
        routeNumber: route?.routeNumber || "",
        routeDescription: route?.description || "",
        routeHours: route?.hoursRequired || "0",
        driverId: driver?.id || null,
        driverName: driver?.name || null,
        driverCode: driver?.code || null,
        hoursRemaining: driver?.monthlyHoursRemaining || null,
        status: assignment.status,
        assignedDate: assignment.assignedDate.toISOString(),
      };
    });
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.currentAssignmentId++;
    const assignment: Assignment = { 
      id,
      routeId: insertAssignment.routeId,
      driverId: insertAssignment.driverId || null,
      assignedDate: insertAssignment.assignedDate,
      status: insertAssignment.status || "pending"
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  async updateAssignment(id: number, insertAssignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const existing = this.assignments.get(id);
    if (!existing) return undefined;
    
    const updated: Assignment = { ...existing, ...insertAssignment };
    this.assignments.set(id, updated);
    return updated;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    return this.assignments.delete(id);
  }

  async createBulkAssignments(insertAssignments: InsertAssignment[]): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    
    for (const insertAssignment of insertAssignments) {
      const id = this.currentAssignmentId++;
      const assignment: Assignment = { 
        id,
        routeId: insertAssignment.routeId,
        driverId: insertAssignment.driverId || null,
        assignedDate: insertAssignment.assignedDate,
        status: insertAssignment.status || "pending"
      };
      this.assignments.set(id, assignment);
      assignments.push(assignment);
    }
    
    return assignments;
  }
}

export const storage = new MemStorage();
