const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const ReceiptModel = {
  // Get all receipts with pagination and filtering
  getAllReceipts: async (limit, offset, filters = {}) => {
    let query = `
      SELECT RECEIPT_ID, BANK_RECEIPT_NO, ENTRY_DATE, AMOUNT_NUMBER, 
             AMOUNT_LETTERS, PAID_ITEMS, SEMESTER_NO, COMMENTS,
             STUDENT_ID, STUDENT_NAME,
             DEPARTMENT_ID, DEPARTMENT_NAME,
             ENTERED_BY_NAME
      FROM (
        SELECT SRRA.RECEIPT.RECEIPT_ID, SRRA.RECEIPT.BANK_RECEIPT_NO, SRRA.RECEIPT.ENTRY_DATE, SRRA.RECEIPT.AMOUNT_NUMBER, 
               SRRA.RECEIPT.AMOUNT_LETTERS, SRRA.RECEIPT.PAID_ITEMS, SRRA.RECEIPT.SEMESTER_NO, SRRA.RECEIPT.COMMENTS,
               SRRA.STUDENT.STUDENT_ID, SRRA.STUDENT.FULL_NAME AS STUDENT_NAME,
               SRRA.DEPARTMENT.DEPARTMENT_ID, SRRA.DEPARTMENT.DEPARTMENT_NAME,
               SRRA.USERS.USER_NAME AS ENTERED_BY_NAME,
               ROWNUM AS rn
        FROM SRRA.RECEIPT 
        JOIN SRRA.STUDENT ON SRRA.RECEIPT.STUDENT_ID = SRRA.STUDENT.STUDENT_ID
        JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
        JOIN SRRA.USERS ON SRRA.RECEIPT.ENTERED_BY = SRRA.USERS.USER_ID
    `;

    const whereClauses = [];
    const params = {};

    // Add date filter if provided
    if (filters.date) {
      whereClauses.push('TRUNC(SRRA.RECEIPT.ENTRY_DATE) = TO_DATE(:filterDate, \'YYYY-MM-DD\')');
      params.filterDate = filters.date;
    }

    // Add search query if provided
    if (filters.q) {
      whereClauses.push(
        '(SRRA.RECEIPT.RECEIPT_ID LIKE :search OR SRRA.STUDENT.STUDENT_ID LIKE :search OR SRRA.STUDENT.FULL_NAME LIKE :search OR SRRA.DEPARTMENT.DEPARTMENT_NAME LIKE :search)'
      );
      params.search = `%${filters.q}%`;
    }

    // Add WHERE clause if any filters exist
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += `
        ORDER BY SRRA.RECEIPT.ENTRY_DATE DESC
      )
      WHERE rn > :offset AND rn <= :offset + :limit
    `;

    params.offset = offset;
    params.limit = limit;

    try {
      const result = await executeQuery(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting receipts:', error);
      throw error;
    }
  },
  // Get total count of receipts with optional filters
  getReceiptsCount: async (filters = {}) => {
    let query = `
      SELECT COUNT(*) AS total
      FROM SRRA.RECEIPT 
      JOIN SRRA.STUDENT ON SRRA.RECEIPT.STUDENT_ID = SRRA.STUDENT.STUDENT_ID
      JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
    `;

    const whereClauses = [];
    const params = {};

    // Add date filter if provided
    if (filters.date) {
      whereClauses.push('TRUNC(SRRA.RECEIPT.ENTRY_DATE) = TO_DATE(:filterDate, \'YYYY-MM-DD\')');
      params.filterDate = filters.date;
    }

    // Add search query if provided
    if (filters.q) {
      whereClauses.push(
        `(SRRA.RECEIPT.RECEIPT_ID LIKE :search OR SRRA.STUDENT.STUDENT_ID LIKE :search OR SRRA.STUDENT.FULL_NAME LIKE :search OR SRRA.DEPARTMENT.DEPARTMENT_NAME LIKE :search)`
      );
      params.search = `%${filters.q}%`;
    }

    // Add WHERE clause if any filters exist
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    try {
      const result = await executeQuery(query, params);
      return result.rows[0].total;
    } catch (error) {
      logger.error('Error getting receipts count:', error);
      throw error;
    }
  },

  createReceipt: async (receiptData) => {
    // Generate a receipt ID
    const getSeqQuery = 'SELECT SRRA.RECEIPT_ID_SEQ.NEXTVAL AS NEW_ID FROM DUAL';
    const seqResult = await executeQuery(getSeqQuery);
    const nextVal = seqResult.rows[0].NEW_ID;
    const receiptId = 'R' + String(nextVal).padStart(6, '0');


    const query = `
      INSERT INTO SRRA.RECEIPT (
        RECEIPT_ID, STUDENT_ID, BANK_RECEIPT_NO, ENTERED_BY, 
        AMOUNT_NUMBER, AMOUNT_LETTERS, PAID_ITEMS, SEMESTER_NO, COMMENTS
      )
      VALUES (
        :receiptId, :studentId, :bankReceiptNo, :enteredBy, 
        :amountNumber, :amountLetters, :paidItems, :semesterNo, :comments
      )
    `;

    try {
      await executeQuery(query, {
        receiptId: receiptId,
        studentId: receiptData.student_id,
        bankReceiptNo: receiptData.bank_receipt_no,
        enteredBy: receiptData.entered_by,
        amountNumber: receiptData.amount_number,
        amountLetters: receiptData.amount_letters,
        paidItems: receiptData.paid_items,
        semesterNo: receiptData.semester_no,
        comments: receiptData.comments || null
      });

      // Get the receipt ID manually
      return receiptId;
    } catch (error) {
      logger.error('Error creating receipt:', error);
      throw error;
    }
  },

  getReceiptById: async (receiptId) => {
    const query = `
      SELECT SRRA.RECEIPT.*, SRRA.STUDENT.FULL_NAME AS STUDENT_NAME, SRRA.DEPARTMENT.DEPARTMENT_NAME, SRRA.USERS.USER_NAME AS ENTERED_BY_NAME
      FROM SRRA.RECEIPT 
      JOIN SRRA.STUDENT ON SRRA.RECEIPT.STUDENT_ID = SRRA.STUDENT.STUDENT_ID
      JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
      JOIN SRRA.USERS ON SRRA.RECEIPT.ENTERED_BY = SRRA.USERS.USER_ID
      WHERE SRRA.RECEIPT.RECEIPT_ID = :receiptId
    `;
    try {
      const result = await executeQuery(query, {
        receiptId: receiptId
      });
      if (result.rows.length === 0) {
        throw new Error('Receipt not found');
      }
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting receipt:', error);
      throw error;
    }
  },

  updateReceipt: async (receiptId, receiptData) => {
    const query = `
      UPDATE SRRA.RECEIPT
      SET
        STUDENT_ID = :studentId,
        BANK_RECEIPT_NO = :bankReceiptNo,
        AMOUNT_NUMBER = :amountNumber,
        AMOUNT_LETTERS = :amountLetters,
        PAID_ITEMS = :paidItems,
        SEMESTER_NO = :semesterNo,
        COMMENTS = :comments
      WHERE RECEIPT_ID = :receiptId
    `;
    try {
      await executeQuery(query, {
        studentId: receiptData.student_id,
        bankReceiptNo: receiptData.bank_receipt_no,
        amountNumber: receiptData.amount_number,
        amountLetters: receiptData.amount_letters,
        paidItems: receiptData.paid_items,
        semesterNo: receiptData.semester_no,
        comments: receiptData.comments || null,
        receiptId: receiptId
      });
    } catch (error) {
      logger.error('Error updating receipt:', error);
      throw error;
    }
  },

  deleteReceipt: async (receiptId) => {
    const query = 'DELETE FROM SRRA.RECEIPT WHERE RECEIPT_ID = :receiptId';
    try {
      await executeQuery(query, {
        receiptId: receiptId
      });
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      throw error;
    }
  },

  getReceiptsByStudentId: async (studentId) => {
    const query = `
      SELECT SRRA.RECEIPT.*, SRRA.USERS.USER_NAME AS ENTERED_BY_NAME
      FROM SRRA.RECEIPT 
      JOIN SRRA.USERS ON SRRA.RECEIPT.ENTERED_BY = SRRA.USERS.USER_ID
      WHERE SRRA.RECEIPT.STUDENT_ID = :studentId
      ORDER BY SRRA.RECEIPT.ENTRY_DATE DESC
    `;
    try {
      const result = await executeQuery(query, {
        studentId: studentId
      });
      return result.rows;
    } catch (error) {
      logger.error('Error getting receipts by student ID:', error);
      throw error;
    }
  },

  // Get recent receipts
  getRecentReceipts: async (limit = 5) => {
    const query = `
      SELECT 
        SRRA.RECEIPT.RECEIPT_ID, 
        SRRA.RECEIPT.STUDENT_ID, 
        SRRA.STUDENT.FULL_NAME AS STUDENT_NAME,
        SRRA.RECEIPT.AMOUNT_NUMBER, 
        SRRA.RECEIPT.ENTRY_DATE 
      FROM 
        SRRA.RECEIPT 
        LEFT JOIN SRRA.STUDENT ON SRRA.RECEIPT.STUDENT_ID = SRRA.STUDENT.STUDENT_ID
      ORDER BY 
        SRRA.RECEIPT.ENTRY_DATE DESC
    `;

    try {
      const result = await executeQuery(query);
      return result.rows.slice(0, limit);
    } catch (error) {
      logger.error('Error getting recent receipts:', error);
      throw error;
    }
  },

  // Get total amount of receipts and total number of receipts
  getAmounts: async () => {
    const query = `
      SELECT 
        SUM(SRRA.RECEIPT.AMOUNT_NUMBER) AS AMOUNT, 
        COUNT(*) AS "COUNT"
      FROM SRRA.RECEIPT
    `;
    try {
      const result = await executeQuery(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting receipt amounts:', error);
      throw error;
    }
  }
};

module.exports = ReceiptModel;