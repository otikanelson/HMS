/**
 * SQLite Database Connection Manager
 * Implements simple SQLite database setup for De Tender Care file management system
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  filename: string;
  mode?: number;
  verbose?: boolean;
}

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      verbose: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  /**
   * Establish database connection
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      console.log('✅ Database already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.filename);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Enable verbose mode for development
      const SqliteClass = this.config.verbose ? sqlite3.verbose().Database : sqlite3.Database;

      this.db = new SqliteClass(
        this.config.filename,
        this.config.mode,
        (error) => {
          if (error) {
            console.error('❌ Failed to connect to SQLite database:', error.message);
            reject(error);
            return;
          }

          this.isConnected = true;
          console.log('🚀 Successfully connected to SQLite database');
          console.log(`📊 Database file: ${this.config.filename}`);
          
          // Configure database for better performance and reliability
          this.configurePragmas()
            .then(() => resolve())
            .catch(reject);
        }
      );
    });
  }

  /**
   * Configure SQLite PRAGMA settings for optimal performance
   */
  private async configurePragmas(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const pragmas = [
      'PRAGMA foreign_keys = ON',           // Enable foreign key constraints
      'PRAGMA journal_mode = WAL',         // Write-Ahead Logging for better concurrency
      'PRAGMA synchronous = NORMAL',       // Balance between safety and performance
      'PRAGMA cache_size = 10000',        // Increase cache size (10MB)
      'PRAGMA temp_store = memory',        // Store temporary data in memory
      'PRAGMA mmap_size = 268435456'       // Use memory-mapped I/O (256MB)
    ];

    for (const pragma of pragmas) {
      await this.run(pragma);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((error) => {
        if (error) {
          console.error('❌ Error closing database:', error.message);
          reject(error);
          return;
        }
        
        this.isConnected = false;
        this.db = null;
        console.log('👋 Disconnected from SQLite database');
        resolve();
      });
    });
  }

  /**
   * Execute SQL query that doesn't return data (INSERT, UPDATE, DELETE, CREATE, etc.)
   */
  async run(sql: string, params?: any[]): Promise<sqlite3.RunResult> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params || [], function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  /**
   * Execute SQL query that returns a single row
   */
  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params || [], (err: Error | null, row: T) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute SQL query that returns multiple rows
   */
  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params || [], (err: Error | null, rows: T[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    await this.run('BEGIN TRANSACTION');
    
    try {
      for (const query of queries) {
        await this.run(query.sql, query.params);
      }
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<{ status: string; message: string; details?: any }> {
    try {
      if (!this.isConnected || !this.db) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Test with a simple query
      await this.get('SELECT 1 as test');
      
      return {
        status: 'connected',
        message: 'Database is healthy',
        details: {
          filename: this.config.filename,
          isConnected: this.isConnected
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: (error as Error).message
      };
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { isConnected: boolean; filename: string } {
    return {
      isConnected: this.isConnected,
      filename: this.config.filename
    };
  }

  /**
   * Get raw database instance (use with caution)
   */
  getRawConnection(): sqlite3.Database | null {
    return this.db;
  }
}

// Singleton database instance
let databaseInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (!databaseInstance) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'hospital_operations.db');
    
    databaseInstance = new DatabaseConnection({
      filename: dbPath,
      verbose: process.env.NODE_ENV === 'development'
    });
  }
  
  return databaseInstance;
}

export default getDatabase();