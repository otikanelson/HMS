const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: '🏥 Hospital Management API - Minimal Version',
    status: 'working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'API is running'
  });
});

module.exports = app;