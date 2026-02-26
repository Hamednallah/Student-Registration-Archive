const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const routes = require('./routes');
const db = require('./config/database');

// Load environment variables
dotenv.config();

// Set environment if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  logger.info('NODE_ENV not set, defaulting to development mode');
}

// Create Express app
const app = express();

// Security middleware
/*
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000", "http://127.0.0.1:5000", "https://l9hcq09q-3000.euw.devtunnels.ms", "https://l9hcq09q-5000.euw.devtunnels.ms"]
    }
  }
}));
*/

// CORS configuration
app.use(require('cors')({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000', "https://l9hcq09q-3000.euw.devtunnels.ms", "https://l9hcq09q-5000.euw.devtunnels.ms"];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
}));
// Handle OPTIONS preflight requests
app.use(express.urlencoded({ extended: true }));

app.options('*', (req, res) => {
  console.log('Handling OPTIONS preflight request for:', req.originalUrl);
  res.status(200).end();
});


// Rate limiting - protect against brute force attacks
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});
//app.use('/api/login', limiter); // Apply to login endpoint specifically
//app.use('/api/register', limiter); // Apply to register endpoint

// Body parsing
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Add cookie parser for CSRF
app.use(cookieParser());

// Temporarily disable CSRF protection while debugging
/*
// CSRF protection
const csrfProtection = csrf({ cookie: true });
// Apply CSRF protection to all routes that change state
app.use('/api/login', csrfProtection);
app.use('/api/register', csrfProtection);
app.use('/api/receipts', csrfProtection);
app.use('/api/students', csrfProtection);
app.use('/api/departments', csrfProtection);
app.use('/api/users', csrfProtection);
*/

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// API routes
app.use('/api', routes);

// Connect to the database
db.initialize()
  .then(() => {
    logger.info('Database connection initialized successfully');
  })
  .catch(err => {
    logger.error('Failed to initialize database:', err);
    // In development, continue without database
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn('Continuing in development mode without database connection');
    } else if (process.env.DB_REQUIRED === 'true') {
      // Only exit if database connection is critical to application
      logger.error('Exiting application due to database connection failure');
      process.exit(1);
    } else {
      logger.warn('Continuing application execution despite database connection failure');
    }
  });
// Serve static files from client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// Add middleware to handle 404 for client-side routes
app.get(/\/(dashboard|students|departments|receipts|users|reports)\.html/, (req, res) => {
  // Redirect old URLs to new structure'
  console.log('Redirecting:', req.path);
  const page = req.path.replace(/^\//, '').replace('.html', '');
  res.redirect(`/src/pages/${page}.html`);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 404 Page - Catch all handler for all routes not defined above
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      success: false, 
      message: 'API endpoint not found' 
    });
  }
  res.status(404).sendFile(path.join(__dirname, '..', 'client', 'src', 'pages', '404.html'));
});

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use(errorHandler);

// Add graceful shutdown handling for database
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Close database connection
  try {
    await db.close();
    logger.info('Database connections closed successfully');
  } catch (err) {
    logger.error('Error closing database connections:', err);
  }
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} is already in use. Trying port ${PORT + 1}`);
    // Try using the next port
    app.listen(PORT + 1, () => {
      logger.info(`Server running on port ${PORT + 1} in ${process.env.NODE_ENV} mode`);
    });
  } else {
    logger.error('Server startup error:', { error: err });
    process.exit(1);
  }
});
