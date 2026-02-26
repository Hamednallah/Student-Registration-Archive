const UserModel = require('../models/userModel');
const { logger } = require('../utils/logger');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users'
    });
  }
};

// Create new user
const createUser = async (req, res) => {
  const userData = req.body;

  try {
    const userId = await UserModel.createUser(userData);
    res.status(201).json({
      success: true,
      data: {
        user_id: userId
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    const status = error.message === 'Username already exists' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await UserModel.getUserById(id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting user:', error);
    const status = error.message === 'User not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const userData = req.body;
  try {
    await UserModel.updateUser(id, userData);
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await UserModel.deleteUser(id);
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};