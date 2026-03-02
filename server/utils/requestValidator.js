const { validateUser, validateReceipt, validateStudent, validateDepartment } = require('./validation');
const { errorResponse } = require('./responseHandler');

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema(req.body);
    if (error) {
      return errorResponse(res, error.details[0].message);
    }
    next();
  };
};

// User request validator
const validateUserRequest = validateRequest(validateUser);

// Receipt request validator
const validateReceiptRequest = validateRequest(validateReceipt);

// Student request validator
const validateStudentRequest = validateRequest(validateStudent);

// Department request validator
const validateDepartmentRequest = validateRequest(validateDepartment);

module.exports = {
  validateUserRequest,
  validateReceiptRequest,
  validateStudentRequest,
  validateDepartmentRequest
};