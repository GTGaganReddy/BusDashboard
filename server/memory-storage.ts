import { Driver, Route, Assignment, RouteAssignmentView, InsertDriver, InsertRoute, InsertAssignment } from "@shared/schema";
import { IStorage } from "./storage";

export class MemStorage implements IStorage {
  private drivers: Driver[] = [];
  private routes: Route[] = [];
  private assignments: Assignment[] = [];
  private nextDriverId = 1;
  private nextRouteId = 1;
  private nextAssignmentId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize drivers (based on previous data)
    this.drivers = [
      { id: 1, name: 'Lenker 1', code: 'LENKER1', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 2, name: 'Lenker 2', code: 'LENKER2', monthlyHoursTotal: '155.00', monthlyHoursRemaining: '155.00', status: 'active' },
      { id: 3, name: 'Lenker 3', code: 'LENKER3', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 4, name: 'Lenker 4', code: 'LENKER4', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 5, name: 'Lenker 5', code: 'LENKER5', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 6, name: 'Lenker 6', code: 'LENKER6', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 7, name: 'Lenker 7', code: 'LENKER7', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 8, name: 'Lenker 8', code: 'LENKER8', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 9, name: 'Lenker 9', code: 'LENKER9', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 10, name: 'Lenker 10', code: 'LENKER10', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 11, name: 'Lenker 11', code: 'LENKER11', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 12, name: 'Lenker 12', code: 'LENKER12', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 13, name: 'Lenker 13', code: 'LENKER13', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 14, name: 'Lenker 14', code: 'LENKER14', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 15, name: 'Lenker 15', code: 'LENKER15', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 16, name: 'Lenker 16', code: 'LENKER16', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' },
      { id: 17, name: 'Lenker 17', code: 'LENKER17', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' },
      { id: 18, name: 'Lenker 18', code: 'LENKER18', monthlyHoursTotal: '174.00', monthlyHoursRemaining: '174.00', status: 'active' },
      { id: 19, name: 'Lenker 19', code: 'LENKER19', monthlyHoursTotal: '100.00', monthlyHoursRemaining: '100.00', status: 'active' },
      { id: 20, name: 'Klagenfurt - Fahrer', code: 'KLAGENFU', monthlyHoursTotal: '66.00', monthlyHoursRemaining: '66.00', status: 'active' },
      { id: 21, name: 'Klagenfurt - Samstagsfahrer', code: 'KLAGEN-S', monthlyHoursTotal: '40.00', monthlyHoursRemaining: '40.00', status: 'active' }
    ];

    // Initialize routes
    this.routes = [
      { id: 1, routeNumber: 'RT-001', description: 'Downtown Circuit', hoursRequired: '11.00' },
      { id: 2, routeNumber: 'RT-002', description: 'Airport Express', hoursRequired: '12.00' },
      { id: 3, routeNumber: 'RT-003', description: 'Mall Connection', hoursRequired: '10.00' },
      { id: 4, routeNumber: 'RT-004', description: 'University Route', hoursRequired: '9.00' },
      { id: 5, routeNumber: 'RT-005', description: 'Industrial Zone', hoursRequired: '8.00' }
    ];

    // Initialize with sample assignments for testing
    this.assignments = [
      {
        id: 1,
        routeId: 1,
        driverId: 1,
        assignedDate: new Date("2025-05-01"),
        status: "assigned",
        driverName: "Lenker 1",
        routeNumber: "401mS",
        routeDescription: "Route 401 Morning Shift",
        routeHours: "8.00",
        driverHoursRemaining: "166.00"
      },
      {
        id: 2,
        routeId: 2,
        driverId: 2,
        assignedDate: new Date("2025-05-02"),
        status: "assigned",
        driverName: "Lenker 2",
        routeNumber: "402mS",
        routeDescription: "Route 402 Morning Shift",
        routeHours: "9.00",
        driverHoursRemaining: "146.00"
      }
    ];

    this.nextDriverId = Math.max(...this.drivers.map(d => d.id)) + 1;
    this.nextRouteId = Math.max(...this.routes.map(r => r.id)) + 1;
    this.nextAssignmentId = this.assignments.length > 0 ? Math.max(...this.assignments.map(a => a.id || 0)) + 1 : 1;
  }

  // Driver operations
  async getDrivers(): Promise<Driver[]> {
    return [...this.drivers];
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    return this.drivers.find(d => d.id === id);
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const newDriver: Driver = {
      id: this.nextDriverId++,
      name: driver.name,
      code: driver.code,
      monthlyHoursTotal: driver.monthlyHoursTotal || "160.00",
      monthlyHoursRemaining: driver.monthlyHoursTotal || "160.00",
      status: driver.status || "active"
    };
    this.drivers.push(newDriver);
    return newDriver;
  }

  async updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const index = this.drivers.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    
    this.drivers[index] = { ...this.drivers[index], ...driver };
    return this.drivers[index];
  }

  // Route operations
  async getRoutes(): Promise<Route[]> {
    return [...this.routes];
  }

  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.find(r => r.id === id);
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const newRoute: Route = {
      id: this.nextRouteId++,
      ...route
    };
    this.routes.push(newRoute);
    return newRoute;
  }

  // Assignment operations
  async getAssignments(): Promise<Assignment[]> {
    return [...this.assignments];
  }

  async getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<RouteAssignmentView[]> {
    const filtered = this.assignments.filter(a => 
      a.assignedDate >= startDate && a.assignedDate <= endDate
    );

    return filtered.map(a => ({
      id: a.id,
      routeNumber: a.routeNumber || '',
      routeDescription: a.routeDescription || '',
      routeHours: a.routeHours || '0',
      driverId: a.driverId,
      driverName: a.driverName,
      driverCode: this.drivers.find(d => d.id === a.driverId)?.code || null,
      hoursRemaining: a.driverHoursRemaining,
      status: a.status,
      assignedDate: a.assignedDate.toISOString().split('T')[0]
    }));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    // Calculate remaining hours for the driver
    let driverHoursRemaining = null;
    if (assignment.driverName) {
      const driver = this.drivers.find(d => d.name === assignment.driverName);
      if (driver) {
        const currentRemaining = parseFloat(driver.monthlyHoursRemaining || '0');
        const routeHours = parseFloat(assignment.routeHours || '0');
        driverHoursRemaining = Math.max(0, currentRemaining - routeHours).toFixed(2);
        
        // Update driver's remaining hours
        driver.monthlyHoursRemaining = driverHoursRemaining;
      }
    }
    
    const newAssignment: Assignment = {
      id: this.nextAssignmentId++,
      routeId: null,
      driverId: null,
      assignedDate: assignment.assignedDate,
      status: (assignment.status as string) || "pending",
      driverName: assignment.driverName || null,
      routeNumber: assignment.routeNumber || null,
      routeDescription: assignment.routeDescription || null,
      routeHours: assignment.routeHours || null,
      driverHoursRemaining: driverHoursRemaining
    };
    this.assignments.push(newAssignment);
    return newAssignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const index = this.assignments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    this.assignments[index] = { ...this.assignments[index], ...assignment };
    return this.assignments[index];
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const index = this.assignments.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    const assignmentToDelete = this.assignments[index];
    
    // Restore driver hours if assignment had a driver
    if (assignmentToDelete.driverName && assignmentToDelete.routeHours) {
      const driver = this.drivers.find(d => d.name === assignmentToDelete.driverName);
      if (driver) {
        const currentRemaining = parseFloat(driver.monthlyHoursRemaining || '0');
        const routeHours = parseFloat(assignmentToDelete.routeHours || '0');
        const restoredHours = currentRemaining + routeHours;
        driver.monthlyHoursRemaining = restoredHours.toFixed(2);
      }
    }
    
    this.assignments.splice(index, 1);
    return true;
  }

  async createBulkAssignments(assignments: InsertAssignment[]): Promise<Assignment[]> {
    const newAssignments: Assignment[] = assignments.map(a => {
      // Calculate remaining hours for the driver
      let driverHoursRemaining = null;
      if (a.driverName) {
        const driver = this.drivers.find(d => d.name === a.driverName);
        if (driver) {
          const currentRemaining = parseFloat(driver.monthlyHoursRemaining || '0');
          const routeHours = parseFloat(a.routeHours || '0');
          driverHoursRemaining = Math.max(0, currentRemaining - routeHours).toFixed(2);
          
          // Update driver's remaining hours
          driver.monthlyHoursRemaining = driverHoursRemaining;
        }
      }
      
      return {
        id: this.nextAssignmentId++,
        routeId: null,
        driverId: null,
        assignedDate: a.assignedDate,
        status: (a.status as string) || "pending",
        driverName: a.driverName || null,
        routeNumber: a.routeNumber || null,
        routeDescription: a.routeDescription || null,
        routeHours: a.routeHours || null,
        driverHoursRemaining: driverHoursRemaining
      };
    });
    
    this.assignments.push(...newAssignments);
    return newAssignments;
  }

  async calculateMonthlyHours(driverName: string, year: number, month: number): Promise<{
    totalHours: number;
    hoursUsed: number;
    hoursRemaining: number;
  }> {
    const driver = this.drivers.find(d => d.name === driverName);
    if (!driver) {
      throw new Error(`Driver ${driverName} not found`);
    }

    const totalHours = parseFloat(driver.monthlyHoursTotal);
    
    // Calculate hours used for the specific month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    const monthAssignments = this.assignments.filter(a => 
      a.driverName === driverName &&
      a.assignedDate >= monthStart &&
      a.assignedDate <= monthEnd
    );
    
    const hoursUsed = monthAssignments.reduce((sum, a) => 
      sum + parseFloat(a.routeHours || '0'), 0
    );
    
    const hoursRemaining = Math.max(0, totalHours - hoursUsed);
    
    return {
      totalHours,
      hoursUsed,
      hoursRemaining
    };
  }

  async updateDriverMonthlyHours(driverName: string, totalHours: number): Promise<void> {
    const driver = this.drivers.find(d => d.name === driverName);
    if (!driver) {
      const code = driverName.replace(/\s+/g, '').substring(0, 8).toUpperCase();
      const newDriver: Driver = {
        id: this.nextDriverId++,
        name: driverName,
        code,
        monthlyHoursTotal: totalHours.toString(),
        monthlyHoursRemaining: totalHours.toString(),
        status: 'active'
      };
      this.drivers.push(newDriver);
    } else {
      driver.monthlyHoursTotal = totalHours.toString();
      driver.monthlyHoursRemaining = totalHours.toString();
    }
  }
}