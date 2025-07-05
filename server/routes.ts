import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssignmentSchema, insertRouteSchema, insertDriverSchema } from "@shared/schema";
import { z } from "zod";
import { 
  squareNumber,
  validateORToolsInput,
  solveOptimalAssignment,
  applyORToolsSolution,
  convertDriversToORToolsFormat,
  convertRoutesToORToolsFormat,
  solveDriverAssignment
} from "./ortools-integration";
import { optimizeDay, getMonthlyBalanceReport, getDaySnapshot } from './gpt-assistant-api';
import type { DayOptimizationRequest } from './gpt-assistant-api';

const bulkAssignmentSchema = z.object({
  assignments: z.array(insertAssignmentSchema)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all drivers
  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.getDrivers();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  // Get driver by name with monthly hours
  app.get("/api/drivers/:name", async (req, res) => {
    try {
      const driverName = req.params.name;
      const drivers = await storage.getDrivers();
      const driver = drivers.find(d => d.name === driverName);
      
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      
      res.json(driver);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch driver" });
    }
  });

  // Get driver monthly hours by name
  app.get("/api/drivers/:name/monthly-hours", async (req, res) => {
    try {
      const driverName = req.params.name;
      const { year, month } = req.query;
      
      const currentDate = new Date();
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      
      const monthlyData = await storage.calculateMonthlyHours(driverName, targetYear, targetMonth);
      
      res.json({
        driverName,
        year: targetYear,
        month: targetMonth,
        ...monthlyData
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch driver monthly hours" });
    }
  });

  // Get all routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  // Get assignments by date range
  app.get("/api/assignments", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      const assignments = await storage.getAssignmentsByDateRange(start, end);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Create or update assignments (bulk POST)
  app.post("/api/assignments", async (req, res) => {
    try {
      const result = bulkAssignmentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: result.error.issues 
        });
      }

      const assignments = await storage.createBulkAssignments(result.data.assignments);
      res.status(201).json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to create assignments" });
    }
  });

  // Update specific assignment
  app.put("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertAssignmentSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: result.error.issues 
        });
      }

      const assignment = await storage.updateAssignment(id, result.data);
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Delete assignment
  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssignment(id);
      
      if (!success) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Create driver
  app.post("/api/drivers", async (req, res) => {
    try {
      const result = insertDriverSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: result.error.issues 
        });
      }

      const driver = await storage.createDriver(result.data);
      res.status(201).json(driver);
    } catch (error) {
      res.status(500).json({ error: "Failed to create driver" });
    }
  });

  // Create route
  app.post("/api/routes", async (req, res) => {
    try {
      const result = insertRouteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: result.error.issues 
        });
      }

      const route = await storage.createRoute(result.data);
      res.status(201).json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to create route" });
    }
  });

  // Get dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const drivers = await storage.getDrivers();
      const routes = await storage.getRoutes();
      const assignments = await storage.getAssignments();

      const activeDrivers = drivers.filter(d => d.status === "active").length;
      const criticalDrivers = drivers.filter(d => d.status === "critical").length;
      const totalHours = routes.reduce((sum, route) => sum + parseFloat(route.hoursRequired), 0);

      const stats = {
        totalRoutes: routes.length,
        activeDrivers,
        totalHours: Math.round(totalHours),
        criticalDrivers,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Get monthly hours for a driver
  app.get("/api/drivers/:name/monthly-hours", async (req, res) => {
    try {
      const { name } = req.params;
      const { year, month } = req.query;
      
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
      const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      
      const monthlyData = await storage.calculateMonthlyHours(decodeURIComponent(name), currentYear, currentMonth);
      res.json(monthlyData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly hours" });
    }
  });

  // Update driver monthly hours total
  app.put("/api/drivers/:name/monthly-hours", async (req, res) => {
    try {
      const { name } = req.params;
      const { totalHours } = req.body;
      
      if (!totalHours || isNaN(parseFloat(totalHours))) {
        return res.status(400).json({ error: "Invalid totalHours value" });
      }
      
      await storage.updateDriverMonthlyHours(decodeURIComponent(name), parseFloat(totalHours));
      res.json({ message: "Monthly hours updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update monthly hours" });
    }
  });



  // OR Tools Integration Endpoints
  
  // Square a number (legacy endpoint)
  app.post("/api/ortools/square", async (req, res) => {
    try {
      const { number } = req.body;
      
      if (typeof number !== 'number') {
        return res.status(400).json({ error: "Number is required" });
      }
      
      const result = await squareNumber(number);
      res.json({ result });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to square number",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validate OR Tools input
  app.post("/api/ortools/validate", async (req, res) => {
    try {
      const validation = await validateORToolsInput(req.body);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to validate input",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Solve optimal assignment
  app.post("/api/ortools/solve", async (req, res) => {
    try {
      const result = await solveOptimalAssignment();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to solve assignment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Simple OR Tools optimization - Takes drivers and routes, returns assignments
  app.post("/api/ortools/optimize", async (req, res) => {
    try {
      const { drivers, routes } = req.body;
      
      if (!drivers || !routes || !Array.isArray(drivers) || !Array.isArray(routes)) {
        return res.status(400).json({ error: "drivers and routes arrays are required" });
      }
      
      const result = await solveDriverAssignment({ drivers, routes });
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to optimize assignments",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Apply assignments to database and update hours
  app.post("/api/ortools/apply", async (req, res) => {
    try {
      const { assignments, assignedDate } = req.body;
      
      if (!assignments || !assignedDate || !Array.isArray(assignments)) {
        return res.status(400).json({ error: "assignments array and assignedDate are required" });
      }
      
      const date = new Date(assignedDate);
      
      // Convert assignments to database format
      const dbAssignments = assignments.map((assignment: any) => ({
        routeNumber: assignment.route_name.split(' - ')[0] || assignment.route_name,
        routeDescription: assignment.route_name.split(' - ')[1] || assignment.route_name,
        routeHours: assignment.route_hours.toString(),
        driverName: assignment.driver_name,
        assignedDate: date,
        status: 'assigned' as const
      }));
      
      // Apply assignments - this will automatically update driver hours
      await storage.createBulkAssignments(dbAssignments);
      
      res.json({ 
        message: "Assignments applied successfully",
        assignmentsCreated: dbAssignments.length
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to apply assignments", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // === GPT ASSISTANT API ENDPOINTS ===
  
  // Main endpoint for GPT assistant to optimize a complete day
  app.post("/api/gpt/optimize-day", async (req, res) => {
    try {
      const request = req.body as DayOptimizationRequest;
      
      if (!request.selectedDate) {
        return res.status(400).json({ error: "selectedDate is required" });
      }
      
      const result = await optimizeDay(request);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to optimize day", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get monthly balance report for all drivers
  app.get("/api/gpt/monthly-balance/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year or month" });
      }
      
      const report = await getMonthlyBalanceReport(year, month);
      res.json(report);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get monthly balance report", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get snapshot of current day status
  app.get("/api/gpt/day-snapshot/:date", async (req, res) => {
    try {
      const date = req.params.date;
      
      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      const snapshot = await getDaySnapshot(date);
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get day snapshot", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get current drivers in OR Tools format
  app.get("/api/ortools/drivers", async (req, res) => {
    try {
      const drivers = await convertDriversToORToolsFormat();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get drivers",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get current routes in OR Tools format
  app.get("/api/ortools/routes", async (req, res) => {
    try {
      const routes = await convertRoutesToORToolsFormat();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to get routes",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Apply OR Tools solution to database
  app.post("/api/ortools/apply", async (req, res) => {
    try {
      const { solution, assignedDate } = req.body;
      
      if (!solution || !assignedDate) {
        return res.status(400).json({ error: "Solution and assignedDate are required" });
      }
      
      const date = new Date(assignedDate);
      await applyORToolsSolution(solution, date);
      
      res.json({ 
        message: "Solution applied successfully",
        assignedDate: date.toISOString().split('T')[0]
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to apply solution",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get OR Tools documentation
  app.get("/api/ortools", async (req, res) => {
    res.json({
      "title": "OR Tools Driver Assignment API",
      "description": "Optimal driver route assignment using Google OR-Tools linear solver",
      "endpoints": {
        "GET /api/ortools": "This documentation",
        "GET /api/ortools/drivers": "Get all drivers in OR Tools format",
        "GET /api/ortools/routes": "Get all routes in OR Tools format",
        "POST /api/ortools/square": "Square a number (legacy endpoint)",
        "POST /api/ortools/validate": "Validate input data for OR Tools",
        "POST /api/ortools/solve": "Solve optimal assignment using current database data",
        "POST /api/ortools/solve-custom": "Solve assignment with custom drivers and routes",
        "POST /api/ortools/apply": "Apply OR Tools solution to database (requires solution and assignedDate)",
        "POST /api/gpt/optimize-day": "GPT Assistant: Optimize complete day with intelligent recommendations",
        "GET /api/gpt/monthly-balance/:year/:month": "GPT Assistant: Get monthly balance report for all drivers",
        "GET /api/gpt/day-snapshot/:date": "GPT Assistant: Get current day snapshot with drivers and routes"
      },
      "examples": {
        "square": {
          "method": "POST",
          "url": "/api/ortools/square",
          "body": { "number": 5 }
        },
        "solve_custom": {
          "method": "POST", 
          "url": "/api/ortools/solve-custom",
          "body": {
            "drivers": [
              { "name": "John Doe", "available_hours": 160 },
              { "name": "Jane Smith", "available_hours": 150 }
            ],
            "routes": [
              { "name": "Route A", "hours": 8 },
              { "name": "Route B", "hours": 6 }
            ]
          }
        },
        "apply_solution": {
          "method": "POST",
          "url": "/api/ortools/apply", 
          "body": {
            "solution": { "status": "optimal", "assignments": [] },
            "assignedDate": "2025-01-05"
          }
        }
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
