import { db } from "./db";
import { drivers, routes, assignments } from "@shared/schema";

async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Clear existing data
    await db.delete(assignments);
    await db.delete(drivers);
    await db.delete(routes);

    // Insert sample drivers
    const sampleDrivers = [
      { name: "John Mitchell", code: "DRV-001", monthlyHoursRemaining: "142.5", status: "active" },
      { name: "Sarah Johnson", code: "DRV-002", monthlyHoursRemaining: "18.2", status: "low" },
      { name: "Mike Rodriguez", code: "DRV-003", monthlyHoursRemaining: "89.3", status: "active" },
      { name: "Lisa Chen", code: "DRV-004", monthlyHoursRemaining: "3.1", status: "critical" },
      { name: "David Williams", code: "DRV-005", monthlyHoursRemaining: "156.8", status: "active" },
    ];

    await db.insert(drivers).values(sampleDrivers);
    console.log("✓ Drivers seeded");

    // Insert sample routes
    const sampleRoutes = [
      { routeNumber: "RT-001", description: "Downtown Circuit", hoursRequired: "8.5" },
      { routeNumber: "RT-002", description: "Suburban Express", hoursRequired: "10.0" },
      { routeNumber: "RT-003", description: "Airport Shuttle", hoursRequired: "6.5" },
      { routeNumber: "RT-004", description: "Night Service", hoursRequired: "9.5" },
      { routeNumber: "RT-005", description: "Cross Town", hoursRequired: "7.0" },
    ];

    await db.insert(routes).values(sampleRoutes);
    console.log("✓ Routes seeded");

    // Insert sample assignments for current week
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

    await db.insert(assignments).values(sampleAssignments);
    console.log("✓ Assignments seeded");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seedDatabase();