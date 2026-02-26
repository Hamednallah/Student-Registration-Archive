const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Enhanced login controller
const login = async (req, res) => {
  const { username, password } = req.body;
  
  logger.info('Login attempt', { username });

  try {
    // Get user from database
    logger.info('Fetching user from database', { username });
    const user = await UserModel.getUserByUsername(username);

    if (!user) {
      logger.warn('Login attempt with unknown username', { username });
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Compare passwords with secure timing
    logger.info('Verifying password', { username });
    const validPassword = await UserModel.verifyPassword(password, user.HASHED_PASSWORD, username);
    if (!validPassword) {
      logger.warn('Invalid password attempt', { username });
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate JWT with additional security
    logger.info('Generating JWT token', { username });
    const token = jwt.sign(
      {
        userId: user.USER_ID,
        role: user.ROLE,
        username: user.USER_NAME
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      }
    );

    // Send token as response
    logger.info('Login successful, sending token',{
      userId: user.USER_ID,
      role: user.ROLE,
      username: user.USER_NAME
    });
    
    return successResponse(res, {
      message: 'Login successful',
      token,
      user: {
        id: user.USER_ID,
        username: user.USER_NAME,
        role: user.ROLE
      }
    });
  } catch (error) {
    logger.error('Login error:', { error: error.message, stack: error.stack, username });
    return errorResponse(res, 'An error occurred during login', 500);
  }
};

// Register controller
const register = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if username exists
    const existingUser = await UserModel.getUserByUsername(username);
    if (existingUser) {
      logger.warn('Registration attempt with existing username', { username });
      return errorResponse(res, 'Username already exists', 400);
    }

    // Create user
    const userId = await UserModel.createUser({
      user_name: username,
      password,
      role
    });

    successResponse(res, 'User registered successfully', { userId }, 201);
    
    logger.info('User registered successfully', { username, role });
  } catch (error) {
    logger.error('Registration error:', error);
    errorResponse(res, 'An error occurred during registration', 500);
  }
};

module.exports = {
  login,
  register
};