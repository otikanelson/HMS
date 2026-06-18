/**
 * Core TypeScript interfaces for De Tender Care File Management
 * Based on design specification requirements
 */

// Base types
export interface BaseEntity {
  created_timestamp: Date;
  updated_timestamp: Date;
}

export interface ContactInformation {
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface HospitalLocation {
  building?: string;
  floor?: number;
  room?: string;
  department?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

// Enums
export enum PatientStatus {
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  IN_TREATMENT = 'IN_TREATMENT',
  WAITING = 'WAITING',
  EMERGENCY = 'EMERGENCY'
}

export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  SUPERVISOR = 'SUPERVISOR',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  VIEWER = 'VIEWER'
}

export enum ResourceType {
  EQUIPMENT = 'EQUIPMENT',
  SUPPLY = 'SUPPLY',
  ROOM = 'ROOM'
}

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum RequestStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  CANCELLED = 'CANCELLED'
}

// Medical Record interface
export interface MedicalRecord {
  record_id: string;
  date: Date;
  description: string;
  doctor_id: string;
  treatment?: string;
  medications?: string[];
  notes?: string;
}

// Maintenance Record interface
export interface MaintenanceRecord {
  maintenance_id: string;
  scheduled_date: Date;
  completed_date?: Date;
  description: string;
  technician_id?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  cost?: number;
  notes?: string;
}

// Schedule interface
export interface Schedule {
  schedule_id: string;
  start_time: Date;
  end_time: Date;
  department: string;
  description?: string;
}

// Core Entities

/**
 * Patient Entity - Manages patient information and medical records
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
export interface Patient extends BaseEntity {
  patient_id: string; // Primary Key - Unique patient identifier
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  contact_info: ContactInformation;
  medical_history: MedicalRecord[];
  current_status: PatientStatus;
  location: HospitalLocation;
  emergency_contact: ContactInformation;
  admission_date?: Date;
  discharge_date?: Date;
  attending_doctor_id?: string;
}

/**
 * Staff Entity - Manages hospital staff profiles and location tracking
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export interface Staff extends BaseEntity {
  staff_id: string; // Primary Key
  employee_id: string; // Unique employee identifier
  first_name: string;
  last_name: string;
  role: UserRole;
  department: string;
  contact_info: ContactInformation;
  schedule: Schedule[];
  location: HospitalLocation;
  supervisor_id?: string; // Foreign Key to Staff
  is_active: boolean;
  hire_date: Date;
}

/**
 * Resource Entity - Manages hospital equipment, supplies, and rooms
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface Resource extends BaseEntity {
  resource_id: string; // Primary Key
  type: ResourceType;
  name: string;
  description?: string;
  quantity: number;
  threshold: number; // Minimum stock level for alerts
  unit_cost?: number;
  location: HospitalLocation;
  status: ResourceStatus;
  maintenance_schedule: MaintenanceRecord[];
  assigned_to?: string; // Foreign Key - can be Patient or Staff ID
  assigned_to_type?: 'PATIENT' | 'STAFF' | 'LOCATION';
  serial_number?: string;
  manufacturer?: string;
  purchase_date?: Date;
  warranty_expiry?: Date;
}

/**
 * User Entity - Manages system authentication and authorization
 * Validates: Requirements 7.1, 7.2, 7.4
 */
export interface User extends BaseEntity {
  user_id: string; // Primary Key
  username: string; // Unique username
  email: string; // Unique email
  password_hash: string;
  role: UserRole;
  staff_id?: string; // Foreign Key to Staff (if user is staff member)
  is_active: boolean;
  last_login?: Date;
  failed_login_attempts: number;
  password_reset_token?: string;
  password_reset_expires?: Date;
}

/**
 * Location Update Request Entity - Manages staff location update approvals
 * Validates: Requirements 2.2, 2.4, 2.5
 */
export interface LocationUpdateRequest extends BaseEntity {
  request_id: string; // Primary Key
  staff_id: string; // Foreign Key to Staff
  current_location: HospitalLocation;
  requested_location: HospitalLocation;
  status: RequestStatus;
  reason?: string;
  approved_by?: string; // Foreign Key to User (supervisor)
  approved_at?: Date;
  notes?: string;
}

/**
 * Session Entity - Manages user authentication sessions
 * Validates: Requirements 7.1, 7.3
 */
export interface Session extends BaseEntity {
  session_id: string; // Primary Key
  user_id: string; // Foreign Key to User
  token: string;
  expires_at: Date;
  is_active: boolean;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Audit Log Entity - Tracks system changes for security and compliance
 * Validates: Requirements 7.3, 8.1
 */
export interface AuditLog extends BaseEntity {
  log_id: string; // Primary Key
  user_id?: string; // Foreign Key to User
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: string; // JSON string
  new_values?: string; // JSON string
  ip_address?: string;
  user_agent?: string;
}

// Database query result types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

export interface SearchOptions extends PaginationOptions {
  query: string;
  filters?: {
    category?: 'patients' | 'staff' | 'resources';
    department?: string;
    status?: string;
    date_from?: Date;
    date_to?: Date;
  };
}

// API Response types
export interface SearchResult {
  id: string;
  type: 'patient' | 'staff' | 'resource';
  title: string;
  subtitle?: string;
  highlights: string[];
  relevance_score: number;
  data: Patient | Staff | Resource;
}

export interface StockAlert {
  resource_id: string;
  name: string;
  current_quantity: number;
  threshold: number;
  shortage_amount: number;
  location: HospitalLocation;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Migration types
export interface Migration {
  id: string;
  name: string;
  up: string; // SQL for applying migration
  down: string; // SQL for rolling back migration
  applied_at?: Date;
}