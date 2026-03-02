const Joi = require('joi');
const { logger } = require('../utils/logger');
const { default: students } = require('../../client/src/pages/students');

// Define schemas
const loginSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 200 characters'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters'
    })
});

// Register validation schema
const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 200 characters'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters'
    }),
  role: Joi.string()
    .valid('Admin', 'User')
    .default('User')
    .messages({
      'any.only': 'Role must be either Admin or User'
    })
});

// Department validation schema
const departmentSchema = Joi.object({
  departmentName: Joi.string()
    .required()
    .max(150)
    .messages({
      'string.empty': 'Department name is required',
      'string.max': 'Department name cannot exceed 150 characters'
    }),
  semestersNo: Joi.number()
    .required()
    .integer()
    .min(1)
    .max(99)
    .messages({
      'number.base': 'Number of semesters must be a number',
      'number.empty': 'Number of semesters is required',
      'number.integer': 'Number of semesters must be an integer',
      'number.min': 'Number of semesters must be at least 1',
      'number.max': 'Number of semesters cannot exceed 99'
    })
});

// Student validation schema
const studentSchema = Joi.object({
  studentId: Joi.string()
    .max(15)
    .messages({
      'string.max': 'Student ID cannot exceed 15 characters'
    }),
  fullName: Joi.string()
    .required()
    .max(150)
    .messages({
      'string.empty': 'Full name is required',
      'string.max': 'Full name cannot exceed 150 characters'
    }),
  semesterNo: Joi.number()
    .required()
    .integer()
    .min(1)
    .max(99)
    .messages({
      'number.base': 'Semester number must be a number',
      'number.empty': 'Semester number is required',
      'number.integer': 'Semester number must be an integer',
      'number.min': 'Semester number must be at least 1',
      'number.max': 'Semester number cannot exceed 99'
    }),
  departmentId: Joi.string()
    .required()
    .max(15)
    .messages({
      'string.empty': 'Department ID is required',
      'string.max': 'Department ID cannot exceed 15 characters'
    }),
  registrationStatus: Joi.string()
    .required()
    .valid('P', 'F')
    .messages({
      'string.empty': 'Registration status is required',
      'any.only': 'Registration status must be either P or F'
    })
});

// Receipt validation schema
const receiptSchema = Joi.object({
  student_id: Joi.string()
    .required()
    .max(15)
    .messages({
      'string.empty': 'Student ID is required',
      'string.max': 'Student ID cannot exceed 15 characters'
    }),
    student_name: Joi.string()
    .required()
    .max(150)
    .messages({
      'string.empty': 'Student name is required',
      'string.max': 'Student name cannot exceed 150 characters'
    }),
  bank_receipt_no: Joi.string()
    .allow('')
    .max(50)
    .messages({
      'string.max': 'Bank receipt number cannot exceed 50 characters'
    }),
  amount_number: Joi.number()
    .required()
    .greater(0)
    .messages({
      'number.base': 'Amount must be a number',
      'number.empty': 'Amount is required',
      'number.greater': 'Amount must be greater than 0'
    }),
  amount_letters: Joi.string()
    .required()
    .max(200)
    .messages({
      'string.empty': 'Amount in words is required',
      'string.max': 'Amount in words cannot exceed 200 characters'
    }),
  paid_items: Joi.string()
    .required()
    .pattern(/^[TRF]+$/)
    .messages({
      'string.empty': 'Paid items is required',
      'string.pattern.base': 'Paid items must only contain T, R, or F characters'
    }),
  department_id: Joi.string()
    .required()
    .max(15)
    .messages({
      'string.empty': 'Department ID is required',
      'string.max': 'Department ID cannot exceed 15 characters'
    }),
  semester_no: Joi.number()
    .required()
    .integer()
    .min(1)
    .max(99)
    .messages({
      'number.base': 'Semester number must be a number',
      'number.empty': 'Semester number is required',
      'number.integer': 'Semester number must be an integer',
      'number.min': 'Semester number must be at least 1',
      'number.max': 'Semester number cannot exceed 99'
    }),
  comments: Joi.string()
    .optional()     // Allows undefined (field missing)
    .allow('', null) // Allows empty string OR null if present
    .max(250)
    .messages({
      'string.max': 'Comments cannot exceed 250 characters'
    })
});

// Generic request validation middleware
const validateRequest = (req, res, next, schema) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn('Validation error:', errorMessages);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

// Middleware functions
const validateLoginInput = (req, res, next) => {
  validateRequest(req, res, next, loginSchema);
};

const validateRegisterInput = (req, res, next) => {
  validateRequest(req, res, next, registerSchema);
};

const validateDepartment = (req, res, next) => {
  validateRequest(req, res, next, departmentSchema);
};

const validateStudent = (req, res, next) => {
  validateRequest(req, res, next, studentSchema);
};

const validateReceipt = (req, res, next) => {
  validateRequest(req, res, next, receiptSchema);
};

// Export validation middleware functions
module.exports = {
  validateLoginInput,
  validateRegisterInput,
  validateDepartment,
  validateStudent,
  validateReceipt,

  // Original validation functions available for direct validation
  validateLogin: (data) => loginSchema.validate(data, { abortEarly: false }),
  validateRegister: (data) => registerSchema.validate(data, { abortEarly: false })
}; 