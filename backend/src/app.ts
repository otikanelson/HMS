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
const noticeRoutes = require('./routes/notices');
const activityLogRoutes = require('./routes/activityLog');
const adminNotesRoutes = require('./routes/adminNotes');
const payrollRoutes = require('./routes/payroll');
const visitRoutes = require('./routes/visits');
const storageMapRoutes = require('./routes/storageMap');
const passwordResetsRoutes = require('./routes/passwordResets');
const inventoryRoutes = require('./routes/inventory');
const banksRoutes = require('./routes/banks');
const database = require('./config/database');
const { authenticateToken, requireAccessLevel } = require('./middleware/auth');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Set trust proxy once
app.set('trust proxy', 1);

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Parse CORS origins from environment or use defaults
const parseCorsOrigins = () => {
  const corsEnv = process.env.CORS_ORIGINS;
  if (corsEnv) {
    return corsEnv.split(',').map(url => url.trim());
  }
  // Default fallback
  return [
    'https://detendercare.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002'
  ];
};

// Middleware
app.use(cors({
  origin: parseCorsOrigins(),
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

// Paystack webhook endpoint (PUBLIC, no authentication required)
// Must be before the payroll router and app.post routes with authentication
app.post('/api/payroll/paystack-webhook', express.json({ type: 'application/json' }), async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const crypto = require('crypto');
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      res.status(401).json({ error: 'No signature' });
      return;
    }

    // Verify signature with raw body
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      res.status(401).json({ error: 'Not configured' });
      return;
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const { event, data } = req.body;

    if (!event || !['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event)) {
      res.status(200).json({ received: true });
      return;
    }

    const reference = data?.reference;
    if (!reference) {
      res.status(200).json({ received: true });
      return;
    }

    const PayrollEntry = require('./models/PayrollEntry');
    const PayrollRun = require('./models/PayrollRun');
    const ActivityLog = require('./models/ActivityLog');

    const entry = await PayrollEntry.findOne({ 'payment.reference': reference });
    if (!entry) {
      res.status(200).json({ received: true });
      return;
    }

    // Update entry status
    if (event === 'transfer.success') {
      entry.payment.status = 'success';
    } else if (event === 'transfer.failed') {
      entry.payment.status = 'failed';
      entry.payment.failureReason = data.reason || 'Transfer failed';
    } else if (event === 'transfer.reversed') {
      entry.payment.status = 'reversed';
      entry.payment.failureReason = data.reason || 'Transfer reversed';
    }

    entry.payment.completedAt = new Date();
    await entry.save();

    // Check if all entries in run are now complete
    const run = await PayrollRun.findById(entry.run);
    if (run) {
      const allEntries = await PayrollEntry.find({ run: run._id });
      const allComplete = allEntries.every((e: any) => 
        e.payment.status === 'success' || e.payment.status === 'failed' || e.payment.status === 'reversed'
      );

      if (allComplete && allEntries.every((e: any) => e.payment.status === 'success')) {
        // All paid
        run.status = 'paid';
        run.paidAt = new Date();
        run.paidBy = run.paymentStartedBy;
        run.paymentStatus = 'finished';
        await run.save();

        // Update all entries to paid
        await PayrollEntry.updateMany(
          { run: run._id, 'payment.status': 'success' },
          { status: 'paid' }
        );

        // Log activity with webhook user
        try {
          await ActivityLog.create({
            action: 'PAYROLL_RUN_PAID',
            targetType: 'PayrollRun',
            targetId: run._id,
            targetLabel: run.periodLabel,
            performedBy: run.paymentStartedBy,
            timestamp: new Date()
          });
        } catch (logErr) {
          console.error('Failed to log webhook activity:', logErr);
        }
      } else if (allComplete) {
        run.paymentStatus = 'finished';
        await run.save();
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 to Paystack
    res.status(200).json({ received: true });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/staff', authenticateToken, staffRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/activity-log', authenticateToken, activityLogRoutes);
app.use('/api/admin-notes', authenticateToken, adminNotesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/visits', authenticateToken, visitRoutes);
app.use('/api/storage-map', authenticateToken, storageMapRoutes);
app.use('/api/password-resets', authenticateToken, requireAccessLevel('ADMINISTRATOR'), passwordResetsRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/banks', banksRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Tender Care API',
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
      update: 'PUT /api/patients/:id - Update patient details',
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

// Start server function - only for local development
async function startServer(): Promise<void> {
  // Only start server if running locally (not in Vercel)
  if (process.env.VERCEL !== '1') {
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
        console.log('🚀 Tender Care API Server');
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
  } else {
    // In Vercel, just connect to database
    try {
      await database.connect();
      console.log('✅ Database connected for serverless');
    } catch (dbError) {
      console.log('⚠️ Database connection failed in serverless environment');
    }
  }
}

// Initialize the server/database connection
if (require.main === module) {
  // Only start server if this file is run directly (not in Vercel)
  startServer();
} else if (process.env.VERCEL === '1') {
  // Initialize database connection for Vercel
  startServer();
}

export default app;