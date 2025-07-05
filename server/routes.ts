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

  // OR Tools sync configuration and testing endpoints
  app.post("/api/or-tools/configure", async (req, res) => {
    try {
      const { baseUrl, apiKey, authHeader } = req.body;
      
      if (!baseUrl) {
        return res.status(400).json({ error: "baseUrl is required" });
      }
      
      const { initializeORToolsSync } = await import('./sync-or-tools');
      const syncInstance = initializeORToolsSync({
        baseUrl,
        apiKey,
        authHeader,
      });
      
      res.json({ 
        message: "OR Tools sync configured successfully",
        baseUrl,
        configured: true
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to configure OR Tools sync" });
    }
  });

  // Test OR Tools connection
  app.post("/api/or-tools/test", async (req, res) => {
    try {
      const { getORToolsSync } = await import('./sync-or-tools');
      const syncInstance = getORToolsSync();
      
      if (!syncInstance) {
        return res.status(400).json({ error: "OR Tools sync not configured" });
      }
      
      // Test connection by fetching driver hours
      await syncInstance.fetchORToolsDriverHours();
      
      res.json({ 
        message: "OR Tools connection successful",
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        error: "OR Tools connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual sync trigger
  app.post("/api/or-tools/sync", async (req, res) => {
    try {
      const { getORToolsSync } = await import('./sync-or-tools');
      const syncInstance = getORToolsSync();
      
      if (!syncInstance) {
        return res.status(400).json({ error: "OR Tools sync not configured" });
      }
      
      const result = await syncInstance.performSync();
      
      res.json({
        message: `Sync completed: ${result.updatedCount} drivers updated`,
        success: result.success,
        updatedCount: result.updatedCount,
        updates: result.updates
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Manual sync failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get sync status
  app.get("/api/or-tools/status", async (req, res) => {
    try {
      const { getORToolsSync } = await import('./sync-or-tools');
      const syncInstance = getORToolsSync();
      
      res.json({
        configured: syncInstance !== null,
        lastSync: syncInstance ? new Date().toISOString() : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get sync status" });
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

  // Solve custom assignment with provided data
  app.post("/api/ortools/solve-custom", async (req, res) => {
    try {
      const result = await solveDriverAssignment(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to solve custom assignment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Apply OR Tools solution to database
  app.post("/api/ortools/apply", async (req, res) => {
    try {
      const { solution, assignedDate } = req.body;
      
      if (!solution || !assignedDate) {
        return res.status(400).json({ error: "Solution and assigned date are required" });
      }

      const date = new Date(assignedDate);
      await applyORToolsSolution(solution, date);
      
      res.json({ message: "Solution applied successfully" });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to apply solution", 
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
        "POST /api/ortools/apply": "Apply OR Tools solution to database (requires solution and assignedDate)"
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
