// Simple CORS proxy for Trybee backend
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Simple request logger
console.log('Starting CORS proxy server...');

// CORS middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Import server.js routes
try {
  console.log('Loading server module...');
  const server = require('./server');
  app.use('/', server);
  console.log('Server module loaded successfully');
} catch (error) {
  console.error('Failed to load server:', error);
  
  // Emergency API endpoints
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', mode: 'emergency' });
  });
  
  app.get('/api/products', (req, res) => {
    res.status(200).json({
      success: true,
      products: [
        { 
          id: '1',
          name: 'Emergency Mode - Service Recovering', 
          price: 0,
          description: 'The backend is currently in emergency mode. Please check back later.'
        }
      ]
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`CORS proxy running on port ${PORT}`);
}); 