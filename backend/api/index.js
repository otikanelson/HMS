// Vercel serverless function handler for Express app
const app = require('../dist/app.js');

// Get the Express app instance
const expressApp = app.default || app;

// Export the handler function
module.exports = expressApp;