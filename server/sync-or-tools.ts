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
      
      const response = await fetch(`${this.config.baseUrl}/drivers`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`OR Tools API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      const orToolsHours = new Map<string, number>();
      
      // Based on your OR Tools app structure
      if (Array.isArray(data)) {
        for (const driver of data) {
          // Assuming your /drivers endpoint returns drivers with remaining_hours field
          orToolsHours.set(driver.name, driver.remaining_hours || driver.remainingHours || 0);
        }
      } else if (data.drivers && Array.isArray(data.drivers)) {
        for (const driver of data.drivers) {
          orToolsHours.set(driver.name, driver.remaining_hours || driver.remainingHours || 0);
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
      
      // Use your OR Tools API - update each driver individually using PUT /drivers/<name>
      const updatePromises = updates.map(async (update) => {
        console.log(`Attempting to update driver: "${update.driverName}" with ${update.newRemainingHours} hours`);
        
        const response = await fetch(`${this.config.baseUrl}/drivers/${encodeURIComponent(update.driverName)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            remaining_hours: update.newRemainingHours,
            monthly_hours: update.currentHours + update.newRemainingHours, // Total monthly hours
            // Include any other fields your OR Tools app expects
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to update driver "${update.driverName}": ${response.status} - ${errorText}`);
          throw new Error(`Failed to update driver ${update.driverName}: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`Successfully updated driver "${update.driverName}":`, result);
        return result;
      });
      
      const results = await Promise.allSettled(updatePromises);
      
      // Count successful updates
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      if (failedCount > 0) {
        console.error(`Sync partially failed: ${successCount} successful, ${failedCount} failed`);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to sync driver "${updates[index].driverName}":`, result.reason);
          }
        });
      }
      
      console.log(`Successfully synced ${successCount}/${updates.length} driver updates to OR tools`);
      
      return failedCount === 0;
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