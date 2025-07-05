import { spawn } from 'child_process';
import path from 'path';
import { storage } from './storage';

export interface ORToolsDriver {
  name: string;
  available_hours: number;
}

export interface ORToolsRoute {
  name: string;
  hours: number;
}

export interface ORToolsInput {
  drivers: ORToolsDriver[];
  routes: ORToolsRoute[];
}

export interface ORToolsAssignment {
  driver_name: string;
  route_name: string;
  route_hours: number;
}

export interface ORToolsResult {
  status: 'optimal' | 'infeasible' | 'error';
  assignments?: ORToolsAssignment[];
  driver_status?: Array<{
    name: string;
    assigned_route: string | null;
    assigned_hours: number;
    remaining_hours: number;
  }>;
  unassigned_routes?: string[];
  statistics?: {
    total_routes: number;
    routes_assigned: number;
    routes_unassigned: number;
    total_hours_assigned: number;
    drivers_working: number;
    drivers_available: number;
  };
  objective_value?: number;
  message?: string;
}

/**
 * Execute OR Tools Python script
 */
async function executeORTools(operation: string, input?: any): Promise<any> {
  const pythonScript = path.join(process.cwd(), 'server', 'ortools-service.py');
  
  return new Promise((resolve, reject) => {
    const args = operation === 'square' && input !== undefined 
      ? [pythonScript, operation, input.toString()]
      : [pythonScript, operation];
    
    const pythonProcess = spawn('python3', args);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // For operations that need JSON input, send it via stdin
    if ((operation === 'solve_assignment' || operation === 'validate') && input) {
      pythonProcess.stdin.write(JSON.stringify(input));
      pythonProcess.stdin.end();
    }
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. stdout: ${stdout}, stderr: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse JSON output: ${stdout}. Error: ${error}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

/**
 * Square a number using OR Tools
 */
export async function squareNumber(number: number): Promise<number> {
  const result = await executeORTools('square', number);
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result.result;
}

/**
 * Validate input data for OR Tools
 */
export async function validateORToolsInput(input: ORToolsInput): Promise<{ valid: boolean; message: string }> {
  const result = await executeORTools('validate', input);
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return {
    valid: result.valid,
    message: result.message
  };
}

/**
 * Solve driver assignment using OR Tools
 */
export async function solveDriverAssignment(input: ORToolsInput): Promise<ORToolsResult> {
  const result = await executeORTools('solve_assignment', input);
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result;
}

/**
 * Convert database drivers to OR Tools format
 */
export async function convertDriversToORToolsFormat(): Promise<ORToolsDriver[]> {
  const drivers = await storage.getDrivers();
  
  return drivers.map(driver => ({
    name: driver.name,
    available_hours: parseFloat(driver.monthlyHoursRemaining)
  }));
}

/**
 * Convert database routes to OR Tools format
 */
export async function convertRoutesToORToolsFormat(): Promise<ORToolsRoute[]> {
  const routes = await storage.getRoutes();
  
  return routes.map(route => ({
    name: `${route.routeNumber} - ${route.description}`,
    hours: parseFloat(route.hoursRequired)
  }));
}

/**
 * Solve optimal assignment for available routes and drivers
 */
export async function solveOptimalAssignment(): Promise<ORToolsResult> {
  // Get current drivers and routes from database
  const [ortoolsDrivers, ortoolsRoutes] = await Promise.all([
    convertDriversToORToolsFormat(),
    convertRoutesToORToolsFormat()
  ]);
  
  // Filter out drivers with no remaining hours
  const availableDrivers = ortoolsDrivers.filter(driver => driver.available_hours > 0);
  
  if (availableDrivers.length === 0) {
    return {
      status: 'error',
      message: 'No drivers with available hours found'
    };
  }
  
  if (ortoolsRoutes.length === 0) {
    return {
      status: 'error',
      message: 'No routes available for assignment'
    };
  }
  
  const input: ORToolsInput = {
    drivers: availableDrivers,
    routes: ortoolsRoutes
  };
  
  // Validate input first
  const validation = await validateORToolsInput(input);
  if (!validation.valid) {
    return {
      status: 'error',
      message: validation.message
    };
  }
  
  // Solve the assignment problem
  return await solveDriverAssignment(input);
}

/**
 * Apply OR Tools solution to database by creating assignments
 */
export async function applyORToolsSolution(solution: ORToolsResult, assignedDate: Date): Promise<void> {
  if (solution.status !== 'optimal' || !solution.assignments) {
    throw new Error('Cannot apply non-optimal solution');
  }
  
  // Get route and driver data for mapping
  const [routes, drivers] = await Promise.all([
    storage.getRoutes(),
    storage.getDrivers()
  ]);
  
  // Create route name to route mapping
  const routeMap = new Map();
  routes.forEach(route => {
    const routeName = `${route.routeNumber} - ${route.description}`;
    routeMap.set(routeName, route);
  });
  
  // Create driver name to driver mapping
  const driverMap = new Map();
  drivers.forEach(driver => {
    driverMap.set(driver.name, driver);
  });
  
  // Convert OR Tools assignments to database assignments
  const assignments = solution.assignments.map(assignment => {
    const route = routeMap.get(assignment.route_name);
    const driver = driverMap.get(assignment.driver_name);
    
    if (!route || !driver) {
      throw new Error(`Route or driver not found: ${assignment.route_name}, ${assignment.driver_name}`);
    }
    
    return {
      routeNumber: route.routeNumber,
      routeDescription: route.description,
      routeHours: route.hoursRequired,
      driverName: driver.name,
      assignedDate: assignedDate,
      status: 'confirmed' as const
    };
  });
  
  // Create bulk assignments in database
  if (assignments.length > 0) {
    await storage.createBulkAssignments(assignments);
  }
}