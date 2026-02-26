const ReceiptModel = require('../models/receiptModel');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const StudentModel = require('../models/studentModel');

// Get all receipts with pagination and filtering
const getAllReceipts = async (req, res) => {
  const { page = 1, limit = 20, q, date } = req.query;
  const offset = (page - 1) * limit;

  try {
    const filters = {};
    if (q) filters.q = q;
    if (date) filters.date = date;

    const receipts = await ReceiptModel.getAllReceipts(limit, offset, filters);
    const total = await ReceiptModel.getReceiptsCount(filters);

    successResponse(res, {
      data: receipts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 200, 'Receipts retrieved successfully');
  } catch (error) {
    logger.error('Error getting receipts:', error);
    errorResponse(res, 'Error retrieving receipts', 500);
  }
};

// Search receipts (now handled by getAllReceipts)
const searchReceipts = async (req, res) => {

  const { q, date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const filters = { q };
    if (date) filters.date = date;
    const receipts = await ReceiptModel.getAllReceipts(limit, offset, filters);
    const total = await ReceiptModel.getReceiptsCount(filters);

    successResponse(res, {
      data: receipts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 200, 'Receipts retrieved successfully');
  } catch (error) {
    logger.error('Error searching receipts:', error);
    errorResponse(res, 'Error retrieving receipts', 500);
  }
};


// Create new receipt
const createReceipt = async (req, res) => {
  try {
    const {
      student_id,
      student_name,
      bank_receipt_no,
      amount_number,
      amount_letters,
      paid_items,
      department_id,
      semester_no,
      comments
    } = req.body;

    // Get user ID from auth middleware
    const userId = req.user.id;

    if (!student_id || !amount_number || !amount_letters || !paid_items || !semester_no) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    // Verify the student exists
    try {
      await StudentModel.getStudentById(student_id);
    } catch (error) {
      const studentData = {
        student_id: student_id,
        full_name: student_name,
        semester_no: semester_no,
        department_id: department_id,
        registration_status: paid_items === 'TF' ? 'F': 'P'
      };
      const student = await StudentModel.createStudent(studentData);
    }

    const receiptData = {
      student_id,
      bank_receipt_no,
      entered_by: userId,
      amount_number,
      amount_letters,
      paid_items,
      semester_no,
      comments
    };

    const receiptId = await ReceiptModel.createReceipt(receiptData);
    
    logger.info('Receipt created with ID:', receiptId);
    successResponse(res, { receipt_id: receiptId }, 201, 'Receipt created successfully');
  } catch (error) {
    logger.error('Error creating receipt:', error);
    errorResponse(res, 'Failed to create receipt', 500);
  }
};

// Get receipt by ID
const getReceiptById = async (req, res) => {
  const { id } = req.params;

  try {
    const receipt = await ReceiptModel.getReceiptById(id);
    successResponse(res, receipt, 200, 'Receipt retrieved successfully');
  } catch (error) {
    if (error.message === 'Receipt not found') {
      return errorResponse(res, 'Receipt not found', 404);
    }
    logger.error('Error getting receipt:', error);
    errorResponse(res, 'Error retrieving receipt', 500);
  }
};

// Update receipt
const updateReceipt = async (req, res) => {
  const { id } = req.params;
  const {
    student_id,
    bank_receipt_no,
    amount_number,
    amount_letters,
    paid_items,
    semester_no,
    comments
  } = req.body;

  // Validate required fields
  if (!student_id || !bank_receipt_no || !amount_number || !amount_letters || !paid_items || !semester_no) {
    return errorResponse(res, 'Missing required fields', 400);
  }

  try {
    const receiptData = {
      student_id,
      bank_receipt_no,
      amount_number,
      amount_letters,
      paid_items,
      semester_no,
      comments
    };

    await ReceiptModel.updateReceipt(id, receiptData);
    successResponse(res, null, 200, 'Receipt updated successfully');
  } catch (error) {
    logger.error('Error updating receipt:', error);
    errorResponse(res, 'Error updating receipt', 500);
  }
};

// Delete receipt
const deleteReceipt = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ReceiptModel.deleteReceipt(id);
    successResponse(res, null, 200, 'Receipt deleted successfully');
  } catch (error) {
    logger.error('Error deleting receipt:', error);
    errorResponse(res, 'Error deleting receipt', 500);
  }
};

// Get receipts by student ID
const getReceiptsByStudentId = async (req, res) => {
  const { studentId } = req.params;

  try {
    const receipts = await ReceiptModel.getReceiptsByStudentId(studentId);
    successResponse(res, receipts, 200, 'Receipts retrieved successfully');
  } catch (error) {
    logger.error('Error getting receipts by student ID:', error);
    errorResponse(res, 'Error retrieving receipts', 500);
  }
};

// Get recent receipts
const getRecentReceipts = async (req, res) => {
  try {
    // Get the 10 most recent receipts
    const recentReceipts = await ReceiptModel.getRecentReceipts(10);
    successResponse(res,recentReceipts, 200,  'Recent receipts retrieved successfully');
  } catch (error) {
    logger.error('Error getting recent receipts:', error);
    errorResponse(res, 'Error retrieving recent receipts', 500);
  }
};

 
const getAmounts = async (req, res) => {
  try {
    const amounts = await ReceiptModel.getAmounts();
    successResponse(res, amounts, 200, 'Amounts retrieved successfully');
  } catch (error) {
    logger.error('Error getting amounts:', error);
    errorResponse(res, 'Error retrieving amounts', 500);
  }
};

module.exports = {
  getAllReceipts,
  createReceipt,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  getReceiptsByStudentId,
  getRecentReceipts,
  searchReceipts,
  getAmounts
};