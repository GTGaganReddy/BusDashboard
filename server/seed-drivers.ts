import { db } from "./db";
import { drivers } from "@shared/schema";
import { eq } from "drizzle-orm";

const driverData = [
  { name: "Lenker 1", monthlyHours: 174.00 },
  { name: "Lenker 2", monthlyHours: 155.00 },
  { name: "Lenker 3", monthlyHours: 174.00 },
  { name: "Lenker 4", monthlyHours: 174.00 },
  { name: "Lenker 5", monthlyHours: 174.00 },
  { name: "Lenker 6", monthlyHours: 174.00 },
  { name: "Lenker 7", monthlyHours: 174.00 },
  { name: "Lenker 8", monthlyHours: 174.00 },
  { name: "Lenker 9", monthlyHours: 174.00 },
  { name: "Lenker 10", monthlyHours: 174.00 },
  { name: "Lenker 11", monthlyHours: 174.00 },
  { name: "Lenker 12", monthlyHours: 174.00 },
  { name: "Lenker 13", monthlyHours: 174.00 },
  { name: "Lenker 14", monthlyHours: 174.00 },
  { name: "Lenker 15", monthlyHours: 174.00 },
  { name: "Lenker 16", monthlyHours: 40.00 },
  { name: "Lenker 17", monthlyHours: 40.00 },
  { name: "Lenker 18", monthlyHours: 174.00 },
  { name: "Lenker 19", monthlyHours: 100.00 },
  { name: "Klagenfurt - Fahrer", monthlyHours: 66.00 },
  { name: "Klagenfurt - Samstagsfahrer", monthlyHours: 40.00 }
];

export async function seedDrivers() {
  console.log("Seeding drivers with correct monthly hours...");
  
  for (const driverInfo of driverData) {
    try {
      // Check if driver already exists
      const [existingDriver] = await db
        .select()
        .from(drivers)
        .where(eq(drivers.name, driverInfo.name))
        .limit(1);
      
      if (existingDriver) {
        // Update existing driver with correct monthly hours
        await db
          .update(drivers)
          .set({ 
            monthlyHoursTotal: driverInfo.monthlyHours.toString(),
            monthlyHoursRemaining: driverInfo.monthlyHours.toString()
          })
          .where(eq(drivers.name, driverInfo.name));
        console.log(`Updated ${driverInfo.name} with ${driverInfo.monthlyHours} hours`);
      } else {
        // Create new driver
        const code = driverInfo.name.replace(/\s+/g, '').substring(0, 8).toUpperCase();
        await db
          .insert(drivers)
          .values({
            name: driverInfo.name,
            code,
            monthlyHoursTotal: driverInfo.monthlyHours.toString(),
            monthlyHoursRemaining: driverInfo.monthlyHours.toString(),
            status: "active"
          });
        console.log(`Created ${driverInfo.name} with ${driverInfo.monthlyHours} hours`);
      }
    } catch (error) {
      console.error(`Error seeding driver ${driverInfo.name}:`, error);
    }
  }
  
  console.log("Driver seeding completed!");
}

// Auto-run seeding when imported
seedDrivers().then(() => {
  console.log("Seeding completed successfully!");
}).catch(console.error);