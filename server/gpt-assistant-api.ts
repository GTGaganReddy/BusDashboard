import { storage } from './storage';
import { solveDriverAssignment, applyORToolsSolution, convertDriversToORToolsFormat, convertRoutesToORToolsFormat } from './ortools-integration';
import type { ORToolsResult, ORToolsDriver, ORToolsRoute } from './ortools-integration';

export interface DayOptimizationRequest {
  selectedDate: string; // ISO date string
  additionalRoutes?: {
    name: string;
    hours: number;
  }[];
  excludeDrivers?: string[]; // Driver names to exclude
  priorityRoutes?: string[]; // Route names that must be assigned
}

export interface DayOptimizationResponse {
  success: boolean;
  date: string;
  optimization: {
    status: 'optimal' | 'infeasible' | 'error';
    assignments: Array<{
      driverName: string;
      routeName: string;
      routeHours: number;
      driverRemainingHours: number;
    }>;
    statistics: {
      totalRoutes: number;
      routesAssigned: number;
      routesUnassigned: number;
      driversWorking: number;
      driversAvailable: number;
      totalHoursAssigned: number;
      averageHoursPerDriver: number;
    };
    unassignedRoutes: string[];
    recommendations?: {
      message: string;
      suggestedActions: string[];
    };
  };
  databaseUpdated: boolean;
  message: string;
}

export interface MonthlyBalanceReport {
  drivers: Array<{
    name: string;
    code: string;
    monthlyHoursTotal: number;
    monthlyHoursUsed: number;
    monthlyHoursRemaining: number;
    utilizationPercentage: number;
    status: 'critical' | 'low' | 'normal' | 'optimal';
  }>;
  summary: {
    totalDrivers: number;
    averageUtilization: number;
    criticalDrivers: number;
    lowHoursDrivers: number;
    optimalDrivers: number;
    totalMonthlyHours: number;
    totalHoursUsed: number;
    totalHoursRemaining: number;
  };
}

/**
 * Main function for GPT assistant to optimize a specific day
 * This handles the complete workflow: get data, optimize, apply results
 */
export async function optimizeDay(request: DayOptimizationRequest): Promise<DayOptimizationResponse> {
  try {
    const selectedDate = new Date(request.selectedDate);
    
    // 1. Get available drivers for the day
    const allDrivers = await convertDriversToORToolsFormat();
    const availableDrivers = allDrivers.filter(driver => 
      !request.excludeDrivers?.includes(driver.name) && 
      driver.available_hours > 0
    );

    // 2. Get routes for the day (existing + additional)
    const existingRoutes = await convertRoutesToORToolsFormat();
    const additionalRoutes = request.additionalRoutes || [];
    
    const allRoutes = [
      ...existingRoutes,
      ...additionalRoutes.map(route => ({
        name: route.name,
        hours: route.hours
      }))
    ];

    // 3. Prioritize routes if specified
    const prioritizedRoutes = request.priorityRoutes ? 
      allRoutes.sort((a, b) => {
        const aIsPriority = request.priorityRoutes!.includes(a.name);
        const bIsPriority = request.priorityRoutes!.includes(b.name);
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        return 0;
      }) : allRoutes;

    // 4. Solve optimization
    const optimizationInput = {
      drivers: availableDrivers,
      routes: prioritizedRoutes
    };

    const result = await solveDriverAssignment(optimizationInput);

    // 5. Apply results to database if optimal
    let databaseUpdated = false;
    if (result.status === 'optimal' && result.assignments) {
      await applyORToolsSolution(result, selectedDate);
      databaseUpdated = true;
    }

    // 6. Generate recommendations
    const recommendations = generateRecommendations(result, availableDrivers, allRoutes);

    // 7. Format response
    const response: DayOptimizationResponse = {
      success: result.status === 'optimal',
      date: request.selectedDate,
      optimization: {
        status: result.status,
        assignments: result.assignments?.map(assignment => ({
          driverName: assignment.driver_name,
          routeName: assignment.route_name,
          routeHours: assignment.route_hours,
          driverRemainingHours: result.driver_status?.find(d => d.name === assignment.driver_name)?.remaining_hours || 0
        })) || [],
        statistics: {
          totalRoutes: result.statistics?.total_routes || 0,
          routesAssigned: result.statistics?.routes_assigned || 0,
          routesUnassigned: result.statistics?.routes_unassigned || 0,
          driversWorking: result.statistics?.drivers_working || 0,
          driversAvailable: result.statistics?.drivers_available || 0,
          totalHoursAssigned: result.statistics?.total_hours_assigned || 0,
          averageHoursPerDriver: result.statistics?.drivers_working ? 
            (result.statistics.total_hours_assigned / result.statistics.drivers_working) : 0
        },
        unassignedRoutes: result.unassigned_routes || [],
        recommendations
      },
      databaseUpdated,
      message: result.status === 'optimal' ? 
        `Successfully optimized ${result.assignments?.length || 0} route assignments for ${selectedDate.toDateString()}` :
        `Optimization ${result.status}: ${result.message || 'Unable to assign all routes'}`
    };

    return response;

  } catch (error) {
    return {
      success: false,
      date: request.selectedDate,
      optimization: {
        status: 'error',
        assignments: [],
        statistics: {
          totalRoutes: 0,
          routesAssigned: 0,
          routesUnassigned: 0,
          driversWorking: 0,
          driversAvailable: 0,
          totalHoursAssigned: 0,
          averageHoursPerDriver: 0
        },
        unassignedRoutes: []
      },
      databaseUpdated: false,
      message: `Error optimizing day: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get monthly balance report for all drivers
 */
export async function getMonthlyBalanceReport(year: number, month: number): Promise<MonthlyBalanceReport> {
  const drivers = await storage.getDrivers();
  
  const driverReports = await Promise.all(
    drivers.map(async (driver) => {
      const monthlyHours = await storage.calculateMonthlyHours(driver.name, year, month);
      const utilizationPercentage = monthlyHours.totalHours > 0 ? 
        (monthlyHours.hoursUsed / monthlyHours.totalHours) * 100 : 0;
      
      let status: 'critical' | 'low' | 'normal' | 'optimal';
      if (monthlyHours.hoursRemaining < 10) status = 'critical';
      else if (monthlyHours.hoursRemaining < 40) status = 'low';
      else if (utilizationPercentage > 80) status = 'optimal';
      else status = 'normal';

      return {
        name: driver.name,
        code: driver.code,
        monthlyHoursTotal: monthlyHours.totalHours,
        monthlyHoursUsed: monthlyHours.hoursUsed,
        monthlyHoursRemaining: monthlyHours.hoursRemaining,
        utilizationPercentage,
        status
      };
    })
  );

  const summary = {
    totalDrivers: driverReports.length,
    averageUtilization: driverReports.reduce((sum, d) => sum + d.utilizationPercentage, 0) / driverReports.length,
    criticalDrivers: driverReports.filter(d => d.status === 'critical').length,
    lowHoursDrivers: driverReports.filter(d => d.status === 'low').length,
    optimalDrivers: driverReports.filter(d => d.status === 'optimal').length,
    totalMonthlyHours: driverReports.reduce((sum, d) => sum + d.monthlyHoursTotal, 0),
    totalHoursUsed: driverReports.reduce((sum, d) => sum + d.monthlyHoursUsed, 0),
    totalHoursRemaining: driverReports.reduce((sum, d) => sum + d.monthlyHoursRemaining, 0)
  };

  return {
    drivers: driverReports,
    summary
  };
}

/**
 * Generate intelligent recommendations based on optimization results
 */
function generateRecommendations(
  result: ORToolsResult, 
  availableDrivers: ORToolsDriver[], 
  allRoutes: ORToolsRoute[]
): { message: string; suggestedActions: string[] } {
  const suggestions: string[] = [];
  
  if (result.status === 'optimal') {
    const stats = result.statistics;
    if (stats) {
      // Check if we have unused driver capacity
      const unusedDrivers = stats.drivers_available - stats.drivers_working;
      if (unusedDrivers > 0) {
        suggestions.push(`${unusedDrivers} drivers are available but not assigned. Consider adding more routes.`);
      }
      
      // Check driver utilization balance
      const driverStatus = result.driver_status || [];
      const workingDrivers = driverStatus.filter(d => d.assigned_hours > 0);
      const maxHours = Math.max(...workingDrivers.map(d => d.assigned_hours));
      const minHours = Math.min(...workingDrivers.map(d => d.assigned_hours));
      
      if (maxHours - minHours > 3) {
        suggestions.push('Work distribution is uneven. Consider redistributing routes for better balance.');
      }
    }
    
    return {
      message: 'Optimization successful! All routes assigned efficiently.',
      suggestedActions: suggestions
    };
  }
  
  if (result.status === 'infeasible') {
    suggestions.push('Add more drivers or reduce route hours to make assignment feasible.');
    if (result.unassigned_routes?.length) {
      suggestions.push(`${result.unassigned_routes.length} routes could not be assigned: ${result.unassigned_routes.join(', ')}`);
    }
    
    return {
      message: 'Some routes cannot be assigned with available drivers.',
      suggestedActions: suggestions
    };
  }
  
  return {
    message: 'Optimization failed. Please check input data and try again.',
    suggestedActions: ['Verify driver availability', 'Check route requirements', 'Ensure database connectivity']
  };
}

/**
 * Get current day snapshot for GPT assistant
 */
export async function getDaySnapshot(date: string) {
  const selectedDate = new Date(date);
  const startDate = new Date(selectedDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(selectedDate);
  endDate.setHours(23, 59, 59, 999);
  
  const [drivers, routes, assignments] = await Promise.all([
    convertDriversToORToolsFormat(),
    convertRoutesToORToolsFormat(),
    storage.getAssignmentsByDateRange(startDate, endDate)
  ]);
  
  return {
    date: date,
    availableDrivers: drivers.filter(d => d.available_hours > 0),
    routes,
    currentAssignments: assignments,
    summary: {
      totalDrivers: drivers.length,
      availableDrivers: drivers.filter(d => d.available_hours > 0).length,
      totalRoutes: routes.length,
      assignedRoutes: assignments.length,
      unassignedRoutes: routes.length - assignments.length
    }
  };
}