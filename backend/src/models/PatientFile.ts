/**
 * Patient File Model for SQLite Database
 */

import { getDatabase } from '../database/connection';

export interface PatientFileData {
  id?: number;
  patientId: string;
  fullName: string;
  phoneNumber: string;
  cabinetNumber: number;
  shelfNumber: number;
  folderNumber: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationHistory {
  id?: number;
  patientFileId: number;
  oldCabinet: number;
  oldShelf: number;
  oldFolder: number;
  newCabinet: number;
  newShelf: number;
  newFolder: number;
  reason?: string;
  changedBy?: string;
  changedAt?: string;
}

export class PatientFile {
  static async initializeSchema(): Promise<void> {
    const db = getDatabase();
    
    // Create patient_files table
    await db.run(`
      CREATE TABLE IF NOT EXISTS patient_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT UNIQUE NOT NULL CHECK(length(patient_id) >= 4 AND length(patient_id) <= 8 AND patient_id GLOB '[0-9]*'),
        full_name TEXT NOT NULL CHECK(length(full_name) >= 2 AND length(full_name) <= 100),
        phone_number TEXT NOT NULL,
        cabinet_number INTEGER NOT NULL CHECK(cabinet_number >= 1 AND cabinet_number <= 50),
        shelf_number INTEGER NOT NULL CHECK(shelf_number >= 1 AND shelf_number <= 20),
        folder_number INTEGER NOT NULL CHECK(folder_number >= 1 AND folder_number <= 100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create location_history table
    await db.run(`
      CREATE TABLE IF NOT EXISTS location_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_file_id INTEGER NOT NULL,
        old_cabinet INTEGER NOT NULL,
        old_shelf INTEGER NOT NULL,
        old_folder INTEGER NOT NULL,
        new_cabinet INTEGER NOT NULL,
        new_shelf INTEGER NOT NULL,
        new_folder INTEGER NOT NULL,
        reason TEXT,
        changed_by TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_file_id) REFERENCES patient_files (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better search performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_patient_id ON patient_files (patient_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_full_name ON patient_files (full_name)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_phone_number ON patient_files (phone_number)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_location ON patient_files (cabinet_number, shelf_number, folder_number)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_updated_at ON patient_files (updated_at DESC)');
  }

  static async create(data: Omit<PatientFileData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatientFileData> {
    const db = getDatabase();
    
    const result = await db.run(`
      INSERT INTO patient_files (patient_id, full_name, phone_number, cabinet_number, shelf_number, folder_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.patientId, data.fullName, data.phoneNumber, data.cabinetNumber, data.shelfNumber, data.folderNumber]);

    const created = await db.get<PatientFileData>('SELECT * FROM patient_files WHERE id = ?', [result.lastID]);
    if (!created) {
      throw new Error('Failed to retrieve created patient file');
    }
    return created;
  }

  static async findByPatientId(patientId: string): Promise<PatientFileData | null> {
    const db = getDatabase();
    const result = await db.get<PatientFileData>('SELECT * FROM patient_files WHERE patient_id = ?', [patientId]);
    return result || null;
  }

  static async findById(id: number): Promise<PatientFileData | null> {
    const db = getDatabase();
    const result = await db.get<PatientFileData>('SELECT * FROM patient_files WHERE id = ?', [id]);
    return result || null;
  }

  static async search(query: string): Promise<PatientFileData[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    
    return await db.all<PatientFileData>(`
      SELECT * FROM patient_files 
      WHERE patient_id LIKE ? 
         OR full_name LIKE ? 
         OR phone_number LIKE ?
      ORDER BY updated_at DESC
    `, [searchTerm, searchTerm, searchTerm]);
  }

  static async findAll(options?: { limit?: number; offset?: number }): Promise<PatientFileData[]> {
    const db = getDatabase();
    const { limit = 20, offset = 0 } = options || {};
    
    return await db.all<PatientFileData>(`
      SELECT * FROM patient_files 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
  }

  static async count(): Promise<number> {
    const db = getDatabase();
    const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM patient_files');
    return result?.count || 0;
  }

  static async countWithPhone(): Promise<number> {
    const db = getDatabase();
    const result = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM patient_files 
      WHERE phone_number IS NOT NULL AND phone_number != ''
    `);
    return result?.count || 0;
  }

  static async updateLocation(
    patientId: string, 
    newCabinet: number, 
    newShelf: number, 
    newFolder: number,
    reason?: string,
    changedBy?: string
  ): Promise<PatientFileData | null> {
    const db = getDatabase();
    
    // Get current patient data
    const current = await this.findByPatientId(patientId);
    if (!current) {
      return null;
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Add to location history if location changed
      if (current.cabinetNumber !== newCabinet || 
          current.shelfNumber !== newShelf || 
          current.folderNumber !== newFolder) {
        
        await db.run(`
          INSERT INTO location_history 
          (patient_file_id, old_cabinet, old_shelf, old_folder, new_cabinet, new_shelf, new_folder, reason, changed_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          current.id, 
          current.cabinetNumber, current.shelfNumber, current.folderNumber,
          newCabinet, newShelf, newFolder,
          reason, changedBy
        ]);
      }

      // Update current location
      await db.run(`
        UPDATE patient_files 
        SET cabinet_number = ?, shelf_number = ?, folder_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE patient_id = ?
      `, [newCabinet, newShelf, newFolder, patientId]);

      await db.run('COMMIT');
      
      return await this.findByPatientId(patientId);
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  static async delete(patientId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM patient_files WHERE patient_id = ?', [patientId]);
    return (result.changes || 0) > 0;
  }

  static async getCabinetStats(): Promise<Array<{ cabinetNumber: number; patientCount: number }>> {
    const db = getDatabase();
    return await db.all<{ cabinetNumber: number; patientCount: number }>(`
      SELECT cabinet_number as cabinetNumber, COUNT(*) as patientCount
      FROM patient_files
      GROUP BY cabinet_number
      ORDER BY cabinet_number ASC
    `);
  }

  static async getStorageStats(): Promise<{
    maxCabinet: number;
    maxShelf: number;
    maxFolder: number;
    minCabinet: number;
    minShelf: number;
    minFolder: number;
  } | null> {
    const db = getDatabase();
    const result = await db.get<{
      maxCabinet: number | null;
      maxShelf: number | null;
      maxFolder: number | null;
      minCabinet: number | null;
      minShelf: number | null;
      minFolder: number | null;
    }>(`
      SELECT 
        MAX(cabinet_number) as maxCabinet,
        MAX(shelf_number) as maxShelf,
        MAX(folder_number) as maxFolder,
        MIN(cabinet_number) as minCabinet,
        MIN(shelf_number) as minShelf,
        MIN(folder_number) as minFolder
      FROM patient_files
    `);
    
    if (!result || result.maxCabinet === null) {
      return null;
    }
    
    return {
      maxCabinet: result.maxCabinet,
      maxShelf: result.maxShelf!,
      maxFolder: result.maxFolder!,
      minCabinet: result.minCabinet!,
      minShelf: result.minShelf!,
      minFolder: result.minFolder!
    };
  }

  static async getRecentPatients(limit: number = 5): Promise<PatientFileData[]> {
    const db = getDatabase();
    return await db.all<PatientFileData>(`
      SELECT * FROM patient_files 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);
  }

  // Utility method to get location display string
  static getLocationDisplay(patient: PatientFileData): string {
    return `Cabinet ${patient.cabinetNumber} → Shelf ${patient.shelfNumber} → Folder ${patient.folderNumber}`;
  }
}