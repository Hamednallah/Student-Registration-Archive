const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const DepartmentModel = {
  getAllDepartments: async () => {
    const query = 'SELECT * FROM SRRA.DEPARTMENT ORDER BY DEPARTMENT_NAME ASC';
    try {
      const result = await executeQuery(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting departments:', error);
      throw error;
    }
  },

  createDepartment: async (departmentData) => {
    try {
      // Generate a department ID
      const getSeqQuery = 'SELECT SRRA.DEPARTMENT_ID_SEQ.NEXTVAL AS NEW_ID FROM DUAL';
      const seqResult = await executeQuery(getSeqQuery);
      const nextVal = seqResult.rows[0].NEW_ID;
      const departmentId = 'D' + String(nextVal).padStart(6, '0');
      
      // Insert department with the generated ID
      const insertQuery = `
        INSERT INTO SRRA.DEPARTMENT (DEPARTMENT_ID, DEPARTMENT_NAME, SEMESTERS_NO)
        VALUES (:departmentId, :departmentName, :semestersNo)
      `;
      
      await executeQuery(insertQuery, {
        departmentId: departmentId,
        departmentName: departmentData.department_name,
        semestersNo: departmentData.semesters_no
      });
      
      return departmentId;
    } catch (error) {
      logger.error('Error creating department:', error);
      throw error;
    }
  },

  getDepartmentById: async (departmentId) => {
    const query = 'SELECT * FROM SRRA.DEPARTMENT WHERE DEPARTMENT_ID = :id';
    try {
      const result = await executeQuery(query, { id: departmentId });
      if (result.rows.length === 0) {
        throw new Error('Department not found');
      }
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting department:', error);
      throw error;
    }
  },

  updateDepartment: async (departmentId, departmentData) => {
    const query = `
      UPDATE SRRA.DEPARTMENT
      SET
        DEPARTMENT_NAME = :departmentName,
        SEMESTERS_NO = :semestersNo
      WHERE DEPARTMENT_ID = :id
    `;
    try {
      await executeQuery(query, {
        departmentName: departmentData.department_name,
        semestersNo: departmentData.semesters_no,
        id: departmentId
      });
    } catch (error) {
      logger.error('Error updating department:', error);
      throw error;
    }
  },

  deleteDepartment: async (departmentId) => {
    const query = 'DELETE FROM SRRA.DEPARTMENT WHERE DEPARTMENT_ID = :id';
    try {
      await executeQuery(query, { id: departmentId });
    } catch (error) {
      logger.error('Error deleting department:', error);
      throw error;
    }
  },

  getDepartmentCount: async () => {
    const query = 'SELECT COUNT(*) AS COUNT FROM SRRA.DEPARTMENT';
    try {
      const result = await executeQuery(query);
      return result.rows[0].COUNT;
    } catch (error) {
      logger.error('Error getting department count:', error);
      throw error;
    }
  },

};

module.exports = DepartmentModel;