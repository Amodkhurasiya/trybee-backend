// This is a simplified entry point for Railway deployment
// It will load the actual server.js file

console.log('Starting Trybee backend server via index.js...');

try {
  // First try to use the start.js file (preferred)
  require('./start.js');
} catch (error) {
  console.error('Error loading start.js:', error.message);
  console.log('Attempting to load server.js directly...');
  
  try {
    // Fallback to loading server.js directly
    require('./server.js');
  } catch (serverError) {
    console.error('Failed to start server:', serverError.message);
    
    // Create an emergency minimal server
    const express = require('express');
    const cors = require('cors');
    const app = express();
    const PORT = process.env.PORT || 5000;
    
    app.use(express.json());
    
    // Enable CORS for all routes with proper configuration
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));
    
    // Add backup CORS headers
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
    
    // Basic health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', mode: 'emergency' });
    });
    
    // Basic products endpoint with mock data
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
    
    app.listen(PORT, () => {
      console.log(`Emergency server running on port ${PORT}`);
    });
  }
} 