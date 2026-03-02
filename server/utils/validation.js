const Joi = require('joi');

// User validation schema
const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'user').required()
});

// Receipt validation schema (English only)
const receiptSchema = Joi.object({
  student_id: Joi.number().required(),
  student_name: Joi.string().required(),
  bank_receipt_no: Joi.string().required(),
  entered_by: Joi.number().required(),
  entry_date: Joi.date().required(),
  amount_number: Joi.number().required(),
  amount_letters: Joi.string().required(),
  paid_items: Joi.string().required(),
  department_id: Joi.string().required,
  semester_no: Joi.number().required(),
  comments: Joi.string().allow('')
});

// Student validation schema
const studentSchema = Joi.object({
  fullName: Joi.string().required(),
  semesterNo: Joi.number().required(),
  departmentId: Joi.number().required(),
  registrationStatus: Joi.boolean().required()
});

// Department validation schema
const departmentSchema = Joi.object({
  departmentName: Joi.string().required(),
  semestersNo: Joi.number().required()
});

module.exports = {
  validateUser: (data) => userSchema.validate(data),
  validateReceipt: (data) => receiptSchema.validate(data),
  validateStudent: (data) => studentSchema.validate(data),
  validateDepartment: (data) => departmentSchema.validate(data)
};
