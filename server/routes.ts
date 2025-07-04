import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssignmentSchema, insertRouteSchema, insertDriverSchema } from "@shared/schema";
import { z } from "zod";

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

  // Sync API: Get all drivers with current hours data
  app.get("/api/sync/drivers", async (req, res) => {
    try {
      const drivers = await storage.getDrivers();
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const driversWithCurrentHours = await Promise.all(
        drivers.map(async (driver) => {
          const monthlyData = await storage.calculateMonthlyHours(driver.name, currentYear, currentMonth);
          return {
            name: driver.name,
            code: driver.code,
            monthlyHoursTotal: parseFloat(driver.monthlyHoursTotal),
            monthlyHoursRemaining: monthlyData.hoursRemaining,
            hoursUsed: monthlyData.hoursUsed,
            status: driver.status,
            lastUpdated: new Date().toISOString()
          };
        })
      );
      
      res.json({
        drivers: driversWithCurrentHours,
        syncTimestamp: new Date().toISOString(),
        totalDrivers: driversWithCurrentHours.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync driver data" });
    }
  });

  // Sync API: Update drivers hours from external system
  app.post("/api/sync/drivers", async (req, res) => {
    try {
      const { drivers: incomingDrivers } = req.body;
      
      if (!Array.isArray(incomingDrivers)) {
        return res.status(400).json({ error: "Invalid drivers data format" });
      }
      
      const results = [];
      
      for (const driverData of incomingDrivers) {
        try {
          const { name, monthlyHoursTotal, hoursUsed } = driverData;
          
          if (!name || !monthlyHoursTotal) {
            results.push({ name: name || "unknown", status: "error", message: "Missing required fields" });
            continue;
          }
          
          // Update driver's monthly hours
          await storage.updateDriverMonthlyHours(name, parseFloat(monthlyHoursTotal));
          
          // Calculate and set remaining hours
          const remainingHours = Math.max(0, parseFloat(monthlyHoursTotal) - (parseFloat(hoursUsed) || 0));
          
          results.push({ 
            name, 
            status: "updated", 
            monthlyHoursTotal: parseFloat(monthlyHoursTotal),
            hoursRemaining: remainingHours
          });
        } catch (error) {
          results.push({ name: driverData.name || "unknown", status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      }
      
      res.json({
        message: "Drivers sync completed",
        results,
        syncTimestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync drivers" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
