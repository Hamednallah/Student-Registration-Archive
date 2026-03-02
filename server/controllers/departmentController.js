const DepartmentModel = require('../models/departmentModel');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Get all departments
const getAllDepartments = async (req, res) => {
  try {
    const departments = await DepartmentModel.getAllDepartments();
    successResponse(res, departments, 200, 'Departments retrieved successfully');
  } catch (error) {
    logger.error('Error getting departments:', error);
    errorResponse(res, 'Error retrieving departments', 500);
  }
};

const validateDepartmentData = (data) => {
  const errors = [];
  
  // Validate required fields
  if (!data.department_name) {
    errors.push('Department name is required');
  }
  
  if (!data.semesters_no) {
    errors.push('Number of semesters is required');
  } else if (isNaN(data.semesters_no) || data.semesters_no < 1 || data.semesters_no > 99) {
    errors.push('Number of semesters must be a number between 1 and 99');
  }
  
  return errors;
};

// Create a new department
const createDepartment = async (req, res) => {
  try {
    const { departmentName, semestersNo } = req.body;

    const departmentData = {
      department_name: departmentName,
      semesters_no: semestersNo
    };

    // Validate department data
    const validationErrors = validateDepartmentData(departmentData);
    
    if (validationErrors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, validationErrors);
    }

    // Create department
    const departmentId = await DepartmentModel.createDepartment(departmentData);
    
    logger.info(`Department created with ID: ${departmentId}`);
    successResponse(res, { departmentId }, 201, 'Department created successfully');
  } catch (error) {
    logger.error('Error in createDepartment:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const department = await DepartmentModel.getDepartmentById(id);
    successResponse(res, department, 200, 'Department retrieved successfully');
  } catch (error) {
    if (error.message === 'Department not found') {
      return errorResponse(res, 'Department not found', 404);
    }
    logger.error('Error getting department:', error);
    errorResponse(res, 'Error retrieving department', 500);
  }
};

// Update department
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { departmentName, semestersNo } = req.body;

  // Validate required fields
  if (!departmentName || !semestersNo) {
    return errorResponse(res, 'Missing required fields', 400);
  }

  try {
    await DepartmentModel.updateDepartment(id, {
      department_name: departmentName,
      semesters_no: semestersNo
    });
    
    successResponse(res, null, 200, 'Department updated successfully');
  } catch (error) {
    logger.error('Error updating department:', error);
    errorResponse(res, 'Error updating department', 500);
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    await DepartmentModel.deleteDepartment(id);
    successResponse(res, null, 200, 'Department deleted successfully');
  } catch (error) {
    logger.error('Error deleting department:', error);
    if (error.message.includes('ORA-02292') || error.message.includes('integrity constraint')) {
      errorResponse(res, 'Cannot delete department - it is referenced by other records', 409);
    } else {
      errorResponse(res, 'Error deleting department', 500);
    }
  }
};

// Get department statistics
const getDepartmentStats = async (req, res) => {
  try {
    // Get total department count
    const totalCount = await DepartmentModel.getDepartmentCount();
    
    // Format data for the response
    const stats = {
      total: totalCount,
    };
    
    // Use the standard success response
    successResponse(res, stats, 200, 'Department statistics retrieved successfully');
  } catch (error) {
    logger.error('Error getting department statistics:', error);
    errorResponse(res, 'Failed to retrieve department statistics', 500);
  }
};

module.exports = {
  getAllDepartments,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
};