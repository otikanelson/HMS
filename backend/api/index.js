// Vercel serverless function handler
const app = require('../dist/app.js');

// Export the Express app as a serverless function
module.exports = app.default || app;