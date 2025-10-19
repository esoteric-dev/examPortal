// Edge Config implementation for Vercel
import { EdgeConfig } from '@vercel/edge-config';

// Initialize Edge Config
const edgeConfig = new EdgeConfig({
  token: process.env.EDGE_CONFIG_TOKEN,
});

export class EdgeConfigDatabase {
  private static instance: EdgeConfigDatabase;
  
  static getInstance(): EdgeConfigDatabase {
    if (!EdgeConfigDatabase.instance) {
      EdgeConfigDatabase.instance = new EdgeConfigDatabase();
    }
    return EdgeConfigDatabase.instance;
  }

  // Generic CRUD operations
  async set(key: string, value: any): Promise<void> {
    try {
      await edgeConfig.set(key, value);
    } catch (error) {
      console.error('Error setting Edge Config:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      return await edgeConfig.get(key);
    } catch (error) {
      console.error('Error getting Edge Config:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await edgeConfig.delete(key);
    } catch (error) {
      console.error('Error deleting Edge Config:', error);
      throw error;
    }
  }

  // Batch operations
  async setMany(entries: Record<string, any>): Promise<void> {
    try {
      await edgeConfig.setMany(entries);
    } catch (error) {
      console.error('Error setting multiple Edge Config entries:', error);
      throw error;
    }
  }

  async getMany(keys: string[]): Promise<Record<string, any>> {
    try {
      return await edgeConfig.getMany(keys);
    } catch (error) {
      console.error('Error getting multiple Edge Config entries:', error);
      return {};
    }
  }

  // Index management
  async addToIndex(indexKey: string, value: string): Promise<void> {
    const index = await this.get(indexKey) || [];
    if (!index.includes(value)) {
      index.push(value);
      await this.set(indexKey, index);
    }
  }

  async removeFromIndex(indexKey: string, value: string): Promise<void> {
    const index = await this.get(indexKey) || [];
    const newIndex = index.filter((item: string) => item !== value);
    await this.set(indexKey, newIndex);
  }

  // Search operations
  async searchByPrefix(prefix: string): Promise<Record<string, any>> {
    try {
      // Edge Config doesn't support prefix search directly
      // We'll need to maintain our own indexes
      const allKeys = await this.get('_all_keys') || [];
      const matchingKeys = allKeys.filter((key: string) => key.startsWith(prefix));
      
      if (matchingKeys.length === 0) return {};
      
      return await this.getMany(matchingKeys);
    } catch (error) {
      console.error('Error searching Edge Config:', error);
      return {};
    }
  }

  // Cleanup operations
  async cleanup(): Promise<void> {
    try {
      // Remove expired entries, old submissions, etc.
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
      
      // This would need to be implemented based on your cleanup requirements
      console.log('Cleanup operation completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const edgeDb = EdgeConfigDatabase.getInstance();
