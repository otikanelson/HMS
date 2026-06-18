# De Tender Care Hospital - Patient File Management System

A comprehensive hospital management system for tracking patient files, staff schedules, and administrative operations.

## Project Structure

This is a monorepo containing both frontend and backend applications:

```
de-tender-care-hospital/
├── frontend/            # React frontend application
├── backend/             # Node.js/Express backend API
├── package.json         # Root package.json for monorepo management
└── README.md           # This file
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd de-tender-care-hospital
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment**
   ```bash
   # Backend configuration
   cd backend
   cp .env.example .env
   # Edit backend/.env with your settings
   ```

4. **Start development servers**
   ```bash
   # From root directory - starts both frontend and backend
   npm run dev
   
   # Or start individually:
   npm run dev:frontend  # Frontend only (port 3001)
   npm run dev:backend   # Backend only (port 3002)
   ```

## Available Scripts

### Development
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only frontend development server
- `npm run dev:backend` - Start only backend development server

### Building
- `npm run build` - Build both frontend and backend for production
- `npm run build:frontend` - Build only frontend
- `npm run build:backend` - Build only backend

### Testing
- `npm test` - Run all tests (frontend and backend)
- `npm run test:frontend` - Run frontend tests
- `npm run test:backend` - Run backend tests

### Code Quality
- `npm run lint` - Lint all code (frontend and backend)
- `npm run lint:frontend` - Lint frontend code
- `npm run lint:backend` - Lint backend code

### Cleanup
- `npm run clean` - Clean all build artifacts
- `npm run clean:frontend` - Clean frontend build
- `npm run clean:backend` - Clean backend build

## System Features

### Patient Management
- Digital patient file tracking
- Physical location mapping (cabinet, shelf, folder)
- Advanced search and filtering
- Patient registration and profile management

### Staff Management
- Employee profiles and contact information
- Shift scheduling and duty status tracking
- Role-based access control
- Emergency contact management

### Security & Authentication
- JWT-based authentication
- Role-based authorization (Admin, Staff)
- Secure password hashing
- Session management

### Dashboard & Reporting
- Real-time statistics and insights
- Staff availability tracking
- Patient file location analytics
- System health monitoring

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: JavaScript/TypeScript
- **Styling**: CSS3 with custom components
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: React Icons

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (development) / MongoDB (production)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest with Supertest

### Development Tools
- **Code Quality**: ESLint, TypeScript
- **Process Management**: Concurrently for multi-process development
- **Build Tools**: TypeScript Compiler, React Scripts
- **Version Control**: Git with structured commits

## Deployment

### Frontend (Static Site)
The frontend is configured for deployment to Vercel, Netlify, or similar static hosting:

```bash
cd frontend
npm run build
# Deploy the 'build' folder
```

### Backend (API Server)
The backend can be deployed to Heroku, Railway, or similar Node.js hosting:

```bash
cd backend
npm run build
npm start
```

## Database Setup

### Initial Setup
1. **Create admin user**
   ```bash
   cd backend
   node scripts/create-admin.js
   ```

2. **Seed sample data**
   ```bash
   node scripts/seed-staff.js
   node scripts/seed-patients.js
   ```

### Default Admin Credentials
- Username: `nelson`
- Password: `NELSON2005`
- Role: Administrator

## Development Workflow

1. **Start development environment**
   ```bash
   npm run dev
   ```

2. **Access applications**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3002

3. **Make changes**
   - Frontend changes auto-reload in browser
   - Backend changes auto-restart server

4. **Run tests before committing**
   ```bash
   npm test
   npm run lint
   ```

## Contributing

1. Create a feature branch from `main`
2. Make your changes in the appropriate workspace (`frontend/` or `backend/`)
3. Test your changes thoroughly
4. Run linting and tests
5. Submit a pull request

## Support

For questions or issues, please refer to:
- Frontend documentation: `frontend/README.md`
- Backend documentation: `backend/README.md`
- API documentation: Available at `http://localhost:3002/api/docs` (when running)

## License

ISC License - De Tender Care Hospital