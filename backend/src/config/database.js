const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Check if already connected
      if (this.isConnected) {
        console.log('✅ Database already connected');
        return this.connection;
      }

      // MongoDB connection options for reliability
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        w: 'majority'
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;

      console.log('🚀 Successfully connected to MongoDB Atlas');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('connected', () => {
        console.log('📡 Mongoose connected to MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📴 Mongoose disconnected from MongoDB');
        this.isConnected = false;
      });

      // Handle app termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;

    } catch (error) {
      console.error('💥 Failed to connect to MongoDB:', error.message);
      this.isConnected = false;
      
      // If MongoDB URI has placeholders, show helpful message
      if (process.env.MONGODB_URI?.includes('<')) {
        console.log('\n📝 MongoDB Setup Required:');
        console.log('1. Go to your MongoDB Atlas dashboard');
        console.log('2. Click "Connect" on your cluster');  
        console.log('3. Choose "Connect your application"');
        console.log('4. Copy the connection string');
        console.log('5. Update MONGODB_URI in your .env file\n');
        console.log('⚠️ Server will continue without database connection for now...\n');
        return; // Don't retry if it's a configuration issue
      }
      
      // Don't crash the app, allow retry for real connection issues
      setTimeout(() => {
        console.log('🔄 Retrying database connection...');
        this.connect();
      }, 5000);
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('👋 Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      return { 
        status: 'connected', 
        message: 'Database is healthy',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }

  // Get connection status
  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      isConnected: this.isConnected,
      readyState: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;