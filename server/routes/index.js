const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validateLoginInput,
  validateRegisterInput,
  validateDepartment,
  validateStudent,
  validateReceipt
} = require('../middleware/validationMiddleware');
const multer = require('multer');

// Import controllers
const authController = require('../controllers/authController');
const receiptController = require('../controllers/receiptController');
const studentController = require('../controllers/studentController');
const departmentController = require('../controllers/departmentController');
const userController = require('../controllers/userController');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Authentication routes
router.post('/login', validateLoginInput, authController.login);
router.post('/register', validateRegisterInput, authController.register);

// Secured routes 
router.use(authenticate);

// Receipt routes
router.get('/receipts', receiptController.getAllReceipts);
router.post('/receipt', validateReceipt, receiptController.createReceipt);
router.get('/receipts/amounts', receiptController.getAmounts);
router.get('/receipts/recent', receiptController.getRecentReceipts);
router.get('/receipts/:id', receiptController.getReceiptById);
router.get('/receipts/student/:studentId', receiptController.getReceiptsByStudentId);
router.get('/receipts/search', receiptController.searchReceipts); 
router.put('/receipts/:id', validateReceipt, receiptController.updateReceipt);
router.delete('/receipts/:id', receiptController.deleteReceipt);

// Student routes
router.get('/students', studentController.getAllStudents);
router.post('/students/new', validateStudent, studentController.createStudent);
router.get('/students/stats', studentController.getStudentStats);
router.get('/students/search', studentController.searchStudents);
router.post('/students/search', studentController.searchStudents);
router.get('/students/department/:departmentId', studentController.getStudentsByDepartment);
router.get('/students/:id', studentController.getStudentById);
router.put('/students/:id', validateStudent, studentController.updateStudent);
router.delete('/students/:id', studentController.deleteStudent);

// Department routes
router.get('/departments', departmentController.getAllDepartments);
router.post('/departments', validateDepartment, departmentController.createDepartment);
router.get('/departments/:id', departmentController.getDepartmentById);
router.get('/department/stats/', departmentController.getDepartmentStats);
router.put('/departments/:id', validateDepartment, departmentController.updateDepartment);
router.delete('/departments/:id', departmentController.deleteDepartment);

// Admin-only routes
router.use(authorize(['A']));

// User routes
router.get('/users', userController.getAllUsers);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;