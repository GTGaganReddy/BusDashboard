import { db } from "./db";
import { drivers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Configuration for OR tools synchronization
interface ORToolsConfig {
  baseUrl: string;
  apiKey?: string;
  authHeader?: string;
}

interface DriverUpdate {
  driverName: string;
  currentHours: number;
  newRemainingHours: number;
}

export class ORToolsSync {
  private config: ORToolsConfig;
  
  constructor(config: ORToolsConfig) {
    this.config = config;
  }

  /**
   * Get current driver hours from our database
   */
  async getCurrentDriverHours(): Promise<Map<string, number>> {
    const allDrivers = await db.select().from(drivers);
    const driverHours = new Map<string, number>();
    
    for (const driver of allDrivers) {
      driverHours.set(driver.name, parseFloat(driver.monthlyHoursRemaining));
    }
    
    return driverHours;
  }

  /**
   * Fetch driver hours from OR tools system
   */
  async fetchORToolsDriverHours(): Promise<Map<string, number>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.authHeader) {
        headers['Authorization'] = this.config.authHeader;
      }
      
      const response = await fetch(`${this.config.baseUrl}/api/drivers/hours`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`OR Tools API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      const orToolsHours = new Map<string, number>();
      
      // Assuming OR tools returns format: [{ driverName: string, remainingHours: number }]
      if (Array.isArray(data)) {
        for (const driver of data) {
          orToolsHours.set(driver.driverName, driver.remainingHours);
        }
      }
      
      return orToolsHours;
    } catch (error) {
      console.error('Failed to fetch OR tools driver hours:', error);
      throw error;
    }
  }

  /**
   * Compare our hours with OR tools and identify drivers that need updates
   */
  async identifyDriverUpdates(): Promise<DriverUpdate[]> {
    const [currentHours, orToolsHours] = await Promise.all([
      this.getCurrentDriverHours(),
      this.fetchORToolsDriverHours(),
    ]);
    
    const updates: DriverUpdate[] = [];
    
    currentHours.forEach((newRemainingHours, driverName) => {
      const orToolsCurrentHours = orToolsHours.get(driverName);
      
      // Only update if:
      // 1. Driver exists in OR tools with different hours, OR
      // 2. Driver doesn't exist in OR tools (new driver)
      if (orToolsCurrentHours === undefined || Math.abs(orToolsCurrentHours - newRemainingHours) > 0.01) {
        updates.push({
          driverName,
          currentHours: orToolsCurrentHours || 0,
          newRemainingHours,
        });
      }
    });
    
    return updates;
  }

  /**
   * Send driver updates to OR tools system
   */
  async syncDriverUpdates(updates: DriverUpdate[]): Promise<boolean> {
    if (updates.length === 0) {
      console.log('No driver updates needed for OR tools sync');
      return true;
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.authHeader) {
        headers['Authorization'] = this.config.authHeader;
      }
      
      const payload = {
        driverUpdates: updates.map(update => ({
          driverName: update.driverName,
          remainingHours: update.newRemainingHours,
        })),
        syncTimestamp: new Date().toISOString(),
      };
      
      const response = await fetch(`${this.config.baseUrl}/api/drivers/hours/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`OR Tools sync failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`Successfully synced ${updates.length} driver updates to OR tools:`, 
                  updates.map(u => `${u.driverName}: ${u.currentHours} → ${u.newRemainingHours}`));
      
      return true;
    } catch (error) {
      console.error('Failed to sync driver updates to OR tools:', error);
      throw error;
    }
  }

  /**
   * Perform full synchronization check and update
   */
  async performSync(): Promise<{ success: boolean; updatedCount: number; updates: DriverUpdate[] }> {
    try {
      const updates = await this.identifyDriverUpdates();
      
      if (updates.length > 0) {
        await this.syncDriverUpdates(updates);
      }
      
      return {
        success: true,
        updatedCount: updates.length,
        updates,
      };
    } catch (error) {
      console.error('OR tools synchronization failed:', error);
      return {
        success: false,
        updatedCount: 0,
        updates: [],
      };
    }
  }
}

// Singleton instance for OR tools synchronization
let orToolsSync: ORToolsSync | null = null;

export function initializeORToolsSync(config: ORToolsConfig): ORToolsSync {
  orToolsSync = new ORToolsSync(config);
  return orToolsSync;
}

export function getORToolsSync(): ORToolsSync | null {
  return orToolsSync;
}

/**
 * Trigger sync after assignment changes
 */
export async function triggerORToolsSync(): Promise<void> {
  if (!orToolsSync) {
    console.log('OR tools sync not initialized, skipping sync');
    return;
  }
  
  try {
    const result = await orToolsSync.performSync();
    if (result.success && result.updatedCount > 0) {
      console.log(`OR tools sync completed: ${result.updatedCount} drivers updated`);
    }
  } catch (error) {
    console.error('OR tools sync trigger failed:', error);
  }
}