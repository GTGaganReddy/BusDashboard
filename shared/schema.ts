import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  monthlyHoursTotal: decimal("monthly_hours_total", { precision: 5, scale: 2 }).notNull().default("160"), // Standard monthly working hours
  monthlyHoursRemaining: decimal("monthly_hours_remaining", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"), // active, inactive, critical, low
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeNumber: text("route_number").notNull().unique(),
  description: text("description").notNull(),
  hoursRequired: decimal("hours_required", { precision: 4, scale: 2 }).notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id),
  driverId: integer("driver_id").references(() => drivers.id),
  assignedDate: timestamp("assigned_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, assigned, critical, unassigned
  // Direct fields for simplified posting
  driverName: text("driver_name"),
  routeNumber: text("route_number"),
  routeDescription: text("route_description"),
  routeHours: decimal("route_hours", { precision: 4, scale: 2 }),
  driverHoursRemaining: decimal("driver_hours_remaining", { precision: 5, scale: 2 }),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  routeId: true,
  driverId: true,
}).extend({
  assignedDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]),
});

export type Driver = typeof drivers.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export interface RouteAssignmentView {
  id: number;
  routeNumber: string;
  routeDescription: string;
  routeHours: string;
  driverId: number | null;
  driverName: string | null;
  driverCode: string | null;
  hoursRemaining: string | null;
  status: string;
  assignedDate: string;
}
