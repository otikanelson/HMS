/**
 * SQLite Database Schema Initialization
 * Creates tables and indexes for De Tender Care file management system
 * Validates: Requirements 6.1, 6.2, 6.5
 */

import { DatabaseConnection } from './connection';

export class DatabaseSchema {
  private db: DatabaseConnection;

  constructor(database: DatabaseConnection) {
    this.db = database;
  }

  /**
   * Initialize complete database schema
   */
  async initializeSchema(): Promise<void> {
    console.log('🔧 Initializing database schema...');

    try {
      await this.db.transaction([
        // Create tables
        ...this.getCreateTableQueries(),
        // Create indexes
        ...this.getCreateIndexQueries(),
        // Create triggers
        ...this.getCreateTriggerQueries()
      ]);

      console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Get CREATE TABLE queries for all entities
   */
  private getCreateTableQueries(): Array<{ sql: string; params?: any[] }> {
    return [
      // Users table - Authentication and authorization
      {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('ADMINISTRATOR', 'SUPERVISOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'VIEWER')),
            staff_id TEXT,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            last_login DATETIME,
            failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            password_reset_token TEXT,
            password_reset_expires DATETIME,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
          )
        `
      },

      // Staff table - Hospital personnel management
      {
        sql: `
          CREATE TABLE IF NOT EXISTS staff (
            staff_id TEXT PRIMARY KEY,
            employee_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('ADMINISTRATOR', 'SUPERVISOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'VIEWER')),
            department TEXT NOT NULL,
            contact_info TEXT, -- JSON string
            schedule TEXT,     -- JSON string array
            location TEXT,     -- JSON string
            supervisor_id TEXT,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            hire_date DATE NOT NULL,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supervisor_id) REFERENCES staff(staff_id) ON DELETE SET NULL
          )
        `
      },

      // Patients table - Patient information and medical records
      {
        sql: `
          CREATE TABLE IF NOT EXISTS patients (
            patient_id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth DATE NOT NULL,
            contact_info TEXT, -- JSON string
            medical_history TEXT, -- JSON string array
            current_status TEXT NOT NULL CHECK (current_status IN ('ADMITTED', 'DISCHARGED', 'IN_TREATMENT', 'WAITING', 'EMERGENCY')),
            location TEXT, -- JSON string
            emergency_contact TEXT, -- JSON string
            admission_date DATETIME,
            discharge_date DATETIME,
            attending_doctor_id TEXT,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (attending_doctor_id) REFERENCES staff(staff_id) ON DELETE SET NULL
          )
        `
      },

      // Resources table - Equipment, supplies, and rooms
      {
        sql: `
          CREATE TABLE IF NOT EXISTS resources (
            resource_id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('EQUIPMENT', 'SUPPLY', 'ROOM')),
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            threshold INTEGER NOT NULL DEFAULT 0,
            unit_cost DECIMAL(10,2),
            location TEXT, -- JSON string
            status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'OUT_OF_SERVICE')),
            maintenance_schedule TEXT, -- JSON string array
            assigned_to TEXT,
            assigned_to_type TEXT CHECK (assigned_to_type IN ('PATIENT', 'STAFF', 'LOCATION')),
            serial_number TEXT,
            manufacturer TEXT,
            purchase_date DATE,
            warranty_expiry DATE,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
      },

      // Location update requests - Staff location approval workflow
      {
        sql: `
          CREATE TABLE IF NOT EXISTS location_update_requests (
            request_id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            current_location TEXT, -- JSON string
            requested_location TEXT NOT NULL, -- JSON string
            status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'DENIED', 'CANCELLED')),
            reason TEXT,
            approved_by TEXT,
            approved_at DATETIME,
            notes TEXT,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
            FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
          )
        `
      },

      // Sessions table - User authentication sessions
      {
        sql: `
          CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            ip_address TEXT,
            user_agent TEXT,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          )
        `
      },

      // Audit log table - System activity tracking
      {
        sql: `
          CREATE TABLE IF NOT EXISTS audit_logs (
            log_id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            old_values TEXT, -- JSON string
            new_values TEXT, -- JSON string
            ip_address TEXT,
            user_agent TEXT,
            created_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
          )
        `
      },

      // Migration tracking table
      {
        sql: `
          CREATE TABLE IF NOT EXISTS migrations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];
  }

  /**
   * Get CREATE INDEX queries for optimal search performance
   */
  private getCreateIndexQueries(): Array<{ sql: string; params?: any[] }> {
    return [
      // Patient indexes - for search and lookup performance
      { sql: 'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (last_name, first_name)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_patients_status ON patients (current_status)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_patients_admission ON patients (admission_date)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients (attending_doctor_id)' },

      // Staff indexes - for directory and location tracking
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_name ON staff (last_name, first_name)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff (employee_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_department ON staff (department)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_role ON staff (role)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_supervisor ON staff (supervisor_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_staff_active ON staff (is_active)' },

      // Resource indexes - for inventory and assignment tracking
      { sql: 'CREATE INDEX IF NOT EXISTS idx_resources_type ON resources (type)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_resources_name ON resources (name)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_resources_assigned ON resources (assigned_to, assigned_to_type)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_resources_quantity ON resources (quantity, threshold)' },

      // User indexes - for authentication
      { sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_users_staff ON users (staff_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active)' },

      // Location request indexes - for approval workflow
      { sql: 'CREATE INDEX IF NOT EXISTS idx_location_requests_staff ON location_update_requests (staff_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_location_requests_status ON location_update_requests (status)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_location_requests_approver ON location_update_requests (approved_by)' },

      // Session indexes - for authentication management
      { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (is_active)' },

      // Audit log indexes - for security monitoring
      { sql: 'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id)' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (created_timestamp)' }
    ];
  }

  /**
   * Get CREATE TRIGGER queries for automatic timestamp updates
   */
  private getCreateTriggerQueries(): Array<{ sql: string; params?: any[] }> {
    const tables = ['users', 'staff', 'patients', 'resources', 'location_update_requests', 'sessions', 'audit_logs'];
    
    return tables.map(table => ({
      sql: `
        CREATE TRIGGER IF NOT EXISTS update_${table}_timestamp 
        AFTER UPDATE ON ${table}
        BEGIN
          UPDATE ${table} 
          SET updated_timestamp = CURRENT_TIMESTAMP 
          WHERE rowid = NEW.rowid;
        END
      `
    }));
  }

  /**
   * Drop all tables (for testing purposes)
   */
  async dropAllTables(): Promise<void> {
    console.log('🗑️ Dropping all database tables...');

    const tables = [
      'audit_logs',
      'sessions', 
      'location_update_requests',
      'resources',
      'patients',
      'staff',
      'users',
      'migrations'
    ];

    try {
      for (const table of tables) {
        await this.db.run(`DROP TABLE IF EXISTS ${table}`);
      }
      console.log('✅ All tables dropped successfully');
    } catch (error) {
      console.error('❌ Failed to drop tables:', error);
      throw error;
    }
  }

  /**
   * Check if database schema is initialized
   */
  async isSchemaInitialized(): Promise<boolean> {
    try {
      const result = await this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      return !!result;
    } catch (error) {
      return false;
    }
  }
}