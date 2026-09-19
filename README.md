# Hospital Management System - Tender Care

Full-stack patient file management system for healthcare facilities.

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication
- Deployed on Vercel (serverless)

**Frontend:**
- React (Create React App)
- React Router v6
- Axios
- Deployed on Vercel

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── middleware/      # Authentication & authorization
│   ├── models/          # Mongoose schemas (9 models)
│   ├── routes/          # API endpoints (9 routes)
│   ├── utils/           # Utility functions
│   └── app.ts           # Main Express application
├── scripts/             # Seed & utility scripts
└── api/                 # Vercel serverless entry point

frontend/
├── src/
│   ├── components/      # React components (16 components)
│   ├── context/         # React Context (Auth)
│   ├── routes/          # Route guards
│   ├── lib/             # HTTP/API configuration
│   ├── App.js           # Main app
│   └── index.js         # Entry point
└── public/              # Static assets
```

## Features

- **Patient Management:** Add, search, view patient files with physical location tracking
- **Staff Management:** Manage staff records, schedules, user accounts
- **Access Control:** Role-based permissions (Administrator, Records Operator, Clinical Staff)
- **Patient Status:** Track patient status (admitted, discharged, archived)
- **Payroll:** Generate and manage payroll runs
- **Activity Logging:** Audit trail of all system actions
- **Admin Notes:** Internal communication system
- **Notices:** System-wide announcements

## Getting Started

### Prerequisites
- Node.js 16+
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Build TypeScript
npm run build

# Start development server
npm start
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit with your backend API URL

# Start development server
npm start
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30m
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:3002/api
```

## API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient file
- `GET /api/staff` - List staff members
- `POST /api/staff` - Add staff member
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/notices` - Active notices
- `GET /api/activity-log` - Activity history
- `GET /api/payroll/runs` - Payroll runs

## Security Notes

⚠️ **Important:** Never commit `.env` files to Git. Always rotate credentials if exposed.

See `SECURITY_ROTATION_CHECKLIST.md` for credential rotation procedures.

## Deployment

Both frontend and backend are configured for Vercel deployment:

- Backend: `vercel.json` configured for serverless deployment
- Frontend: Standard Create React App build

## Scripts

### Backend
- `npm run build` - Compile TypeScript
- `npm start` - Start server
- `node scripts/create-admin.js` - Create admin account
- `node scripts/seed-staff.js` - Seed sample staff data
- `node scripts/seed-patients.js` - Seed sample patient data
- `node scripts/reset-staff-password.js <staffId> <newPassword>` - Reset password

### Frontend
- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests

## License

Proprietary - Tender Care Healthcare Management System
