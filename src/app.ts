import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Import routes and database (using require for JS files)
const patientRoutes = require('./routes/patients');
const staffRoutes = require('./routes/staff');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const database = require('./config/database');
const { authenticateToken } = require('./middleware/auth');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Trust first proxy for Railway/Render
  app.set('trust proxy', 1);
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Trust proxy for rate limiting to work correctly
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://your-frontend-domain.vercel.app'] 
    : ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3002'], // Allow both frontend and backend ports
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    let dbHealth;
    try {
      dbHealth = await database.healthCheck();
    } catch (dbError) {
      dbHealth = { 
        status: 'disconnected', 
        message: 'Database not configured or unreachable',
        error: (dbError as Error).message
      };
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/staff', authenticateToken, staffRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 De Tender Care API',
    description: 'Patient File Management System Backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      profile: '/api/profile',
      patients: '/api/patients',
      staff: '/api/staff',
      search: '/api/patients/search?q=<query>',
      dashboard: '/api/dashboard/stats'
    },
    documentation: {
      search: 'GET /api/patients/search?q=<query> - Search patients by ID, name, or phone',
      create: 'POST /api/patients - Create new patient file',
      update: 'PUT /api/patients/:id/location - Update file location',
      get: 'GET /api/patients/:id - Get specific patient',
      list: 'GET /api/patients?page=1&limit=20 - List patients with pagination'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `API endpoint ${req.path} not found`,
    availableEndpoints: ['/api/health', '/api/patients', '/api/staff', '/api/dashboard']
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: error.message || 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server function
async function startServer(): Promise<void> {
  try {
    // Try to connect to database
    console.log('🔌 Connecting to MongoDB...');
    try {
      await database.connect();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.log('⚠️ Database connection failed, but server will continue...');
      console.log('🔧 You can update your MongoDB connection and restart later.\n');
    }

    // Start HTTP server regardless of database connection
    const server = app.listen(PORT, () => {
      console.log('🚀 De Tender Care API Server');
      console.log(`📊 Port: ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 Search Example: http://localhost:${PORT}/api/patients/search?q=Adebayo`);
      console.log('✅ Server is running and ready for requests\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n⚠️ SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        if (database.isConnected) {
          await database.disconnect();
        }
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n⚠️ SIGINT received, shutting down gracefully...');
      server.close(async () => {
        if (database.isConnected) {
          await database.disconnect();
        }
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 Failed to start server:', (error as Error).message);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;