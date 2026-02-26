// Import individual models
const UserModel = require('./userModel');
const ReceiptModel = require('./receiptModel');
const StudentModel = require('./studentModel');
const DepartmentModel = require('./departmentModel');

// Export all models from a single entry point
module.exports = {
  UserModel,
  ReceiptModel,
  StudentModel,
  DepartmentModel
};