const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const bcrypt = require('bcrypt');

const UserModel = {
  getAllUsers: async () => {
    const query = 'SELECT USER_ID, USER_NAME, ROLE FROM SRRA.USERS ORDER BY USER_NAME ASC';
    try {
      const result = await executeQuery(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  },

  createUser: async (userData) => {
    let checkQuery = 'SELECT * FROM SRRA.USERS WHERE USER_NAME = :username';
    let checkParams = { username: userData.username };
    
    // Add userId to check if provided
    if (userData.user_id) {
      checkQuery += ' OR USER_ID = :userId';
      checkParams.userId = userData.userId;
    }
    
    const insertQuery = `
      INSERT INTO SRRA.USERS (USER_ID, USER_NAME, HASHED_PASSWORD, ROLE)
      VALUES (:userId, :username, :password, :role)
    `;
    
    try {
      const checkResult = await executeQuery(checkQuery, checkParams);
      
      if (checkResult.rows.length > 0) {
        throw new Error('Username or User ID already exists');
      }
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Generate random USER_ID if not provided
      let userId = userData.userId;
      if (!userId) {
        // Generate a random string of 6 alphanumeric characters
        userId = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      
      await executeQuery(insertQuery, {
        userId: userId,
        username: userData.username,
        password: hashedPassword,
        role: userData.role || 'U'
      });

      return userId;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  },

  getUserById: async (userId) => {
    const query = 'SELECT USER_ID, USER_NAME, ROLE FROM SRRA.USERS WHERE USER_ID = :id';
    try {
      const result = await executeQuery(query, { id: userId });
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  },

  getUserByUsername: async (username) => {
    const query = 'SELECT * FROM SRRA.USERS WHERE USER_NAME = :username';
    try {
      const result = await executeQuery(query, { username });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  },


  updateUser: async (userId, userData) => {
    let query;
    let params;

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      logger.debug(`Updating password for user ${userId} with hash: ${hashedPassword}`);
      query = `
        UPDATE SRRA.USERS
        SET
          USER_NAME = :username,
          HASHED_PASSWORD = :password,
          ROLE = :role
        WHERE USER_ID = :id
      `;
      params = {
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        id: userId
      };
    } else {
      query = `
        UPDATE SRRA.USERS
        SET
          USER_NAME = :username,
          ROLE = :role
        WHERE USER_ID = :id
      `;
      params = {
        username: userData.user_name,
        role: userData.role,
        id: userId
      };
    }

    try {
      const result = await executeQuery(query, params);
      logger.debug(`Update result: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    const query = 'DELETE FROM SRRA.USERS WHERE USER_ID = :id';
    try {
      await executeQuery(query, { id: userId });
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  },

  verifyPassword: async (plainPassword, hashedPassword) => {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }
};

module.exports = UserModel;