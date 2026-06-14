# Design Document

## Architecture Overview

The Hospital Operations MVP is designed as a modular web-based system with a clean separation between data access, business logic, and presentation layers. The architecture supports small hospital environments with simplified deployment and maintenance requirements.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Patient        │  Staff          │  Resource                   │
│  Dashboard      │  Dashboard      │  Dashboard                  │
├─────────────────┼─────────────────┼─────────────────────────────┤
│                   Unified Search Interface                     │
├─────────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Patient        │  Staff          │  Resource                   │
│  Management     │  Management     │  Management                 │
│  Service        │  Service        │  Service                    │
├─────────────────┴─────────────────┴─────────────────────────────┤
│  Authentication Service  │  Search Engine  │  Backup Service    │
├─────────────────────────────────────────────────────────────────┤
│                     Data Access Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                    SQLite Database                             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### Core Components

#### 1. Patient Management Service
**Responsibility:** Manages patient registration, medical records, and location tracking

**Key Operations:**
```pseudocode
FUNCTION RegisterPatient(demographicData)
    VALIDATE demographicData
    patient_id = GenerateUniquePatientId()
    patient = CREATE Patient WITH patient_id AND demographicData
    timestamp = GetCurrentTimestamp()
    SAVE patient TO database WITH timestamp
    RETURN patient_id
END FUNCTION

FUNCTION UpdatePatientInfo(patient_id, updates)
    patient = FIND Patient BY patient_id
    timestamp = GetCurrentTimestamp()
    FOR each field IN updates
        APPLY field update TO patient WITH timestamp
    END FOR
    SAVE patient TO database
    RETURN success
END FUNCTION
```

**Data Model:**
```pseudocode
ENTITY Patient
    patient_id: UniqueIdentifier
    demographic_info: PersonalData
    medical_history: MedicalRecord[]
    current_status: PatientStatus
    location: HospitalLocation
    created_timestamp: DateTime
    updated_timestamp: DateTime
END ENTITY
```

#### 2. Staff Management Service
**Responsibility:** Manages staff profiles, schedules, and location tracking with supervisor approval

**Key Operations:**
```pseudocode
FUNCTION RequestLocationUpdate(staff_id, new_location)
    request = CREATE LocationUpdateRequest WITH staff_id, new_location
    request.status = "PENDING_APPROVAL"
    request.timestamp = GetCurrentTimestamp()
    SAVE request TO database
    NOTIFY supervisor OF request
    RETURN request_id
END FUNCTION

FUNCTION ApproveLocationUpdate(request_id, supervisor_id, decision)
    request = FIND LocationUpdateRequest BY request_id
    IF decision == "APPROVED"
        staff = FIND Staff BY request.staff_id
        staff.location = request.new_location
        staff.updated_timestamp = GetCurrentTimestamp()
        SAVE staff TO database
    ELSE
        NOTIFY request.staff_id OF denial
    END IF
    request.status = decision
    request.approved_by = supervisor_id
    SAVE request TO database
END FUNCTION
```

**Data Model:**
```pseudocode
ENTITY Staff
    staff_id: UniqueIdentifier
    profile: StaffProfile
    role: UserRole
    schedule: Schedule[]
    location: HospitalLocation
    created_timestamp: DateTime
    updated_timestamp: DateTime
END ENTITY

ENTITY LocationUpdateRequest
    request_id: UniqueIdentifier
    staff_id: UniqueIdentifier
    new_location: HospitalLocation
    status: RequestStatus
    timestamp: DateTime
    approved_by: UniqueIdentifier
END ENTITY
```

#### 3. Resource Management Service
**Responsibility:** Tracks hospital equipment, supplies, and room occupancy

**Key Operations:**
```pseudocode
FUNCTION AssignEquipment(equipment_id, assignment_target)
    equipment = FIND Equipment BY equipment_id
    IF equipment.status == "AVAILABLE"
        equipment.status = "ASSIGNED"
        equipment.assigned_to = assignment_target
        equipment.updated_timestamp = GetCurrentTimestamp()
        SAVE equipment TO database
        RETURN success
    ELSE
        RETURN equipment_unavailable_error
    END IF
END FUNCTION

FUNCTION CheckStockLevels()
    resources = FIND ALL Resources WHERE quantity > 0
    alerts = []
    FOR each resource IN resources
        IF resource.quantity < resource.threshold
            alert = CREATE StockAlert WITH resource.id, resource.quantity
            ADD alert TO alerts
        END IF
    END FOR
    RETURN alerts
END FUNCTION
```

**Data Model:**
```pseudocode
ENTITY Resource
    resource_id: UniqueIdentifier
    type: ResourceType
    name: String
    quantity: Integer
    threshold: Integer
    location: HospitalLocation
    status: ResourceStatus
    maintenance_schedule: MaintenanceRecord[]
    updated_timestamp: DateTime
END ENTITY
```

#### 4. Search Engine
**Responsibility:** Provides unified search across all system data

**Key Operations:**
```pseudocode
FUNCTION SearchAll(query, filters)
    results = []
    
    IF filters.include_patients
        patient_results = SearchPatients(query)
        ADD patient_results TO results WITH category "patients"
    END IF
    
    IF filters.include_staff
        staff_results = SearchStaff(query)
        ADD staff_results TO results WITH category "staff"
    END IF
    
    IF filters.include_resources
        resource_results = SearchResources(query)
        ADD resource_results TO results WITH category "resources"
    END IF
    
    RETURN HighlightMatches(results, query)
END FUNCTION

FUNCTION SearchWithFuzzyMatching(query, target_fields)
    matches = []
    FOR each record IN database
        FOR each field IN target_fields
            similarity = CalculateSimilarity(query, record[field])
            IF similarity > FUZZY_THRESHOLD
                ADD record TO matches WITH similarity_score
            END IF
        END FOR
    END FOR
    RETURN SortByRelevance(matches)
END FUNCTION
```

#### 5. Authentication Service
**Responsibility:** Manages user authentication and authorization

**Key Operations:**
```pseudocode
FUNCTION AuthenticateUser(username, password)
    user = FIND User BY username
    IF user EXISTS AND VerifyPassword(password, user.password_hash)
        session = CreateSession(user.id)
        session.expires_at = GetCurrentTimestamp() + 30_MINUTES
        SAVE session TO database
        RETURN session_token
    ELSE
        LOG unauthorized_access_attempt WITH username, timestamp
        RETURN authentication_failed
    END IF
END FUNCTION

FUNCTION CheckPermissions(user_id, action, resource)
    user = FIND User BY user_id
    permissions = GetPermissionsForRole(user.role)
    IF permissions.allows(action, resource)
        RETURN authorized
    ELSE
        RETURN unauthorized
    END IF
END FUNCTION
```

### Data Models

#### Core Entities

**Patient Entity:**
```pseudocode
ENTITY Patient
    patient_id: String (Primary Key)
    first_name: String
    last_name: String
    date_of_birth: Date
    contact_info: ContactInformation
    medical_history: MedicalRecord[]
    current_status: PatientStatus
    location: HospitalLocation
    emergency_contact: ContactInformation
    created_timestamp: DateTime
    updated_timestamp: DateTime
END ENTITY
```

**Staff Entity:**
```pseudocode
ENTITY Staff
    staff_id: String (Primary Key)
    employee_id: String (Unique)
    first_name: String
    last_name: String
    role: UserRole
    department: String
    contact_info: ContactInformation
    schedule: Schedule[]
    location: HospitalLocation
    supervisor_id: String (Foreign Key)
    created_timestamp: DateTime
    updated_timestamp: DateTime
END ENTITY
```

**Resource Entity:**
```pseudocode
ENTITY Resource
    resource_id: String (Primary Key)
    type: ResourceType (EQUIPMENT | SUPPLY | ROOM)
    name: String
    description: String
    quantity: Integer
    threshold: Integer
    unit_cost: Decimal
    location: HospitalLocation
    status: ResourceStatus
    maintenance_schedule: MaintenanceRecord[]
    assigned_to: String (Foreign Key - Optional)
    created_timestamp: DateTime
    updated_timestamp: DateTime
END ENTITY
```

### Interface Design

#### Dashboard Components

**Patient Dashboard:**
- Patient search and registration interface
- Real-time patient status display
- Location tracking visualization
- Medical history access

**Staff Dashboard:**
- Staff directory and profiles
- Schedule management interface
- Location update request system
- Supervisor approval controls

**Resource Dashboard:**
- Equipment and supply inventory
- Room occupancy display
- Maintenance schedule tracker
- Stock level alerts

#### Search Interface

**Unified Search Bar:**
```pseudocode
COMPONENT SearchInterface
    INPUT search_query: String
    SELECT category_filters: String[]
    OUTPUT results: SearchResult[]
    
    FUNCTION OnSearchInput(query)
        IF query.length >= 2
            results = SearchAll(query, GetActiveFilters())
            DisplayResults(results)
        END IF
    END FUNCTION
END COMPONENT
```

### Error Handling

**Centralized Error Management:**
```pseudocode
ENUM ErrorType
    VALIDATION_ERROR
    AUTHENTICATION_ERROR
    AUTHORIZATION_ERROR
    DATABASE_ERROR
    NETWORK_ERROR
    BUSINESS_LOGIC_ERROR
END ENUM

FUNCTION HandleError(error, context)
    LOG error WITH context AND timestamp
    
    MATCH error.type
        CASE VALIDATION_ERROR:
            RETURN user_friendly_validation_message
        CASE AUTHENTICATION_ERROR:
            RETURN authentication_required_response
        CASE AUTHORIZATION_ERROR:
            RETURN access_denied_response
        CASE DATABASE_ERROR:
            RETURN system_unavailable_response
        DEFAULT:
            RETURN generic_error_response
    END MATCH
END FUNCTION
```

**Error Recovery Strategies:**
- Automatic retry for transient failures
- Graceful degradation for non-critical features
- Offline mode support for essential operations
- Data integrity validation and repair

### Security Design

**Authentication & Authorization:**
```pseudocode
ENUM UserRole
    ADMINISTRATOR
    SUPERVISOR
    NURSE
    DOCTOR
    RECEPTIONIST
    VIEWER
END ENUM

PERMISSIONS_MATRIX = {
    ADMINISTRATOR: [ALL_PERMISSIONS],
    SUPERVISOR: [APPROVE_LOCATION_UPDATES, VIEW_STAFF, MANAGE_SCHEDULES],
    DOCTOR: [VIEW_PATIENTS, UPDATE_MEDICAL_RECORDS, VIEW_RESOURCES],
    NURSE: [VIEW_PATIENTS, UPDATE_PATIENT_STATUS, REQUEST_LOCATION_UPDATE],
    RECEPTIONIST: [REGISTER_PATIENTS, VIEW_PATIENT_INFO],
    VIEWER: [VIEW_DASHBOARDS_READONLY]
}
```

**Data Protection:**
- Password hashing using bcrypt
- Session-based authentication with 30-minute timeout
- Role-based access control
- Audit logging for sensitive operations
- Data encryption for backups

### Performance Considerations

**Search Optimization:**
- Database indexing on frequently searched fields
- Caching for common search queries
- Pagination for large result sets
- Asynchronous search with progressive loading

**Database Performance:**
```pseudocode
INDEXES:
    Patient: (patient_id, last_name, first_name)
    Staff: (staff_id, employee_id, last_name, department)
    Resource: (resource_id, type, status, location)
    
FUNCTION OptimizeQuery(query)
    IF query.involves_multiple_tables
        USE appropriate JOIN strategy
    END IF
    
    IF query.has_text_search
        USE full_text_search_index
    END IF
    
    RETURN optimized_query
END FUNCTION
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Patient ID Uniqueness

*For any* set of patient registration requests, all assigned patient identifiers SHALL be unique across the system.

**Validates: Requirements 1.2**

### Property 2: Patient Data Integrity

*For any* patient information stored in the system, retrieving patient data SHALL return exactly the same information that was originally stored.

**Validates: Requirements 1.3**

### Property 3: Update Timestamping

*For any* patient information update operation, the system SHALL assign a valid timestamp that is not earlier than the previous update timestamp.

**Validates: Requirements 1.4**

### Property 4: Location Update Approval Workflow

*For any* staff location update request, the request SHALL remain in pending status until explicitly approved or denied by a supervisor.

**Validates: Requirements 2.2**

### Property 5: Location Update Application

*For any* approved location update request, the staff member's location SHALL be updated to match the requested location.

**Validates: Requirements 2.4**

### Property 6: Denial Notification

*For any* denied location update request, the requesting staff member SHALL receive a notification about the denial.

**Validates: Requirements 2.5**

### Property 7: Resource Assignment Status

*For any* equipment assignment operation, the equipment status SHALL change from "AVAILABLE" to "ASSIGNED" and track the assignment target.

**Validates: Requirements 3.2**

### Property 8: Stock Alert Generation

*For any* resource with quantity below its defined threshold, the system SHALL generate a low stock alert.

**Validates: Requirements 3.4**

### Property 9: Comprehensive Search Coverage

*For any* search query, results SHALL include matches from all enabled categories (patients, staff, resources) that contain relevant data.

**Validates: Requirements 4.2**

### Property 10: Fuzzy Search Matching

*For any* partial or misspelled search query, the search engine SHALL return relevant results based on similarity matching algorithms.

**Validates: Requirements 4.3**

### Property 11: Search Result Highlighting

*For any* search result, matching text portions SHALL be highlighted to clearly indicate why the result matched the query.

**Validates: Requirements 4.4**

### Property 12: Category Filtering

*For any* search query with category filters applied, results SHALL only contain items from the specified categories.

**Validates: Requirements 4.5**

### Property 13: Module Information Isolation

*For any* module dashboard, displayed information SHALL only include data relevant to that specific module.

**Validates: Requirements 5.2**

### Property 14: Dashboard Customization Persistence

*For any* dashboard widget configuration changes, the customization SHALL persist and be reflected in subsequent dashboard loads.

**Validates: Requirements 5.3**

### Property 15: Real-time Data Synchronization

*For any* data change in the system, all open dashboards displaying related information SHALL reflect the change without requiring manual refresh.

**Validates: Requirements 5.4**

### Property 16: Authentication Validation

*For any* login attempt, access SHALL only be granted when valid credentials are provided, and invalid attempts SHALL be denied and logged.

**Validates: Requirements 7.1, 7.3**

### Property 17: Role-based Access Control

*For any* user action request, the system SHALL only allow the action if the user's role has appropriate permissions for that specific operation.

**Validates: Requirements 7.2**

### Property 18: Password Reset Authorization

*For any* password reset request, the operation SHALL only succeed when initiated by an authorized administrator.

**Validates: Requirements 7.4**

### Property 19: Backup Integrity Verification

*For any* generated backup file, the integrity verification process SHALL correctly identify whether the backup data is valid and complete.

**Validates: Requirements 8.4**

### Property 20: Offline Data Synchronization

*For any* changes made while offline, all modifications SHALL be properly synchronized with the server when network connectivity is restored.

**Validates: Requirements 9.5**

### Property 21: Census Report Accuracy

*For any* daily census report generation, the patient occupancy data SHALL accurately reflect the current state of patient admissions and discharges.

**Validates: Requirements 10.1**

### Property 22: Staff Utilization Reporting

*For any* staff utilization report, the data SHALL accurately represent actual staff work hours and assignments by department.

**Validates: Requirements 10.2**

### Property 23: Resource Analytics Accuracy

*For any* resource usage analytics calculation, the trends and statistics SHALL be mathematically correct based on the underlying usage data.

**Validates: Requirements 10.3**

### Property 24: Export Format Integrity

*For any* report export operation, both PDF and CSV formats SHALL contain identical data with appropriate formatting for each format type.

**Validates: Requirements 10.5**

## Testing Strategy

### Property-Based Testing Implementation

**Test Configuration:**
- Minimum 100 iterations per property test
- Random data generation for comprehensive input coverage
- Each property test tagged with format: **Feature: hospital-operations-mvp, Property {number}: {property_text}**

**Generator Strategy:**
```pseudocode
GENERATORS:
    PatientData: RandomPatientDemographics()
    StaffData: RandomStaffProfiles()
    ResourceData: RandomEquipmentAndSupplies()
    SearchQueries: RandomTextWithVariations()
    UserCredentials: RandomValidAndInvalidLogins()
    LocationUpdates: RandomHospitalLocations()
END GENERATORS
```

### Unit Testing Balance

**Unit Tests Focus:**
- Specific integration points between components
- Edge cases for data validation
- Error handling scenarios
- Module isolation verification

**Integration Tests:**
- Database setup and migration verification
- Authentication system integration
- Search engine performance validation
- Backup and recovery procedures
- Mobile responsiveness across device types

### Deployment Architecture

**SQLite Database Setup:**
```pseudocode
FUNCTION InitializeDatabase()
    CREATE TABLE patients (...)
    CREATE TABLE staff (...)
    CREATE TABLE resources (...)
    CREATE TABLE location_requests (...)
    CREATE TABLE users (...)
    CREATE TABLE sessions (...)
    
    CREATE INDEX idx_patient_name ON patients (last_name, first_name)
    CREATE INDEX idx_staff_department ON staff (department)
    CREATE INDEX idx_resource_type ON resources (type, status)
    
    INSERT sample_data FOR demonstration
    
    RETURN database_ready_status
END FUNCTION
```

**Migration Support:**
```pseudocode
FUNCTION RunMigrations(current_version, target_version)
    migrations = GetMigrationScripts(current_version, target_version)
    
    FOR each migration IN migrations
        BEGIN TRANSACTION
        TRY
            EXECUTE migration.sql
            UPDATE version TO migration.version
            COMMIT TRANSACTION
        CATCH error
            ROLLBACK TRANSACTION
            RETURN migration_failed_error
        END TRY
    END FOR
    
    RETURN migration_success
END FUNCTION
```

This design provides a solid foundation for the hospital operations MVP with clear separation of concerns, comprehensive error handling, and strong correctness properties that can be validated through automated testing.