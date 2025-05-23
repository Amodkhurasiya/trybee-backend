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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }
  
  next();
});

// Debug middleware for authentication issues
app.use((req, res, next) => {
  if (req.headers.authorization) {
    console.log('Auth header found:', req.headers.authorization.substring(0, 20) + '...');
  } else {
    console.log('No auth header in request');
  }
  next();
});

// Import server.js routes
try {
  console.log('Loading server module...');
  // We're not going to use the server as middleware, just to access routes
  const serverModule = require('./server');
  
  // For unprotected routes, let's set up our own implementations
  app.get('/api/products', async (req, res) => {
    try {
      // Pass request to the products router 
      const productRoutes = require('./routes/product.routes');
      // This will let the router handle it
      productRoutes(req, res);
    } catch (error) {
      console.error('Error in /api/products:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products',
        products: [
          { 
            id: '1',
            name: 'Error fetching products', 
            price: 0,
            description: 'Please try again later.'
          }
        ]
      });
    }
  });
  
  // Emergency API endpoints
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', mode: 'proxy' });
  });
  
  // For all other routes, use the original app's router
  app.use('/', (req, res, next) => {
    console.log(`Passing request to original server router: ${req.method} ${req.path}`);
    serverModule(req, res, next);
  });
  
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
  console.log(`CORS proxy running on port ${PORT} - CORS headers enabled for all origins`);
}); 