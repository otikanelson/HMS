# De Tender Care Hospital - Backend

Backend API server for the De Tender Care Hospital Patient File Management System.

## Features

- Patient file management with location tracking
- Staff management and scheduling
- Authentication and authorization
- Role-based access control
- RESTful API endpoints

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (local) / MongoDB (production)
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest
- **Code Quality**: ESLint, TypeScript

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run in development**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build directory

## Database Setup

### Seeding Data

1. **Create admin user**
   ```bash
   node scripts/create-admin.js
   ```

2. **Seed staff data**
   ```bash
   node scripts/seed-staff.js
   ```

3. **Seed patient data**
   ```bash
   node scripts/seed-patients.js
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/search` - Search patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Staff
- `GET /api/staff` - Get all staff
- `GET /api/staff/search` - Search staff
- `POST /api/staff` - Create new staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Environment Variables

```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hospital_operations
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── database/        # Database connection and schema
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── types/           # TypeScript type definitions
│   └── app.ts           # Main application file
├── scripts/             # Database seeding scripts
├── data/                # SQLite database files
└── dist/                # Compiled JavaScript (generated)
```