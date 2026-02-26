const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const StudentModel = {
  getAllStudents: async (limit = 20, offset = 0) => {
    const query = `
      SELECT s.STUDENT_ID, s.FULL_NAME, s.DEPARTMENT_ID, s.SEMESTER_NO, s.REGISTRATION_STATUS, DEPARTMENT_NAME
      FROM (
        SELECT s.* , d.DEPARTMENT_NAME,
               ROWNUM AS rn
        FROM SRRA.STUDENT s
        JOIN SRRA.DEPARTMENT d ON s.DEPARTMENT_ID = d.DEPARTMENT_ID
        ORDER BY s.FULL_NAME ASC
      ) s
      WHERE rn > :offset AND rn <= :offset + :limit
    `;
  
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM SRRA.STUDENT s
      JOIN SRRA.DEPARTMENT d ON s.DEPARTMENT_ID = d.DEPARTMENT_ID
    `;
  
    try {
      const [result, countResult] = await Promise.all([
        executeQuery(query, { limit, offset }),
        executeQuery(countQuery)
      ]);
  
      return {
        students: result.rows,
        total: countResult.rows[0].total
      };
    } catch (error) {
      logger.error('Error getting students:', error);
      throw error;
    }
  },

  createStudent: async (studentData) => {
    const query = 
      `INSERT INTO SRRA.STUDENT (
        STUDENT_ID, FULL_NAME, SEMESTER_NO, DEPARTMENT_ID, REGISTRATION_STATUS
      )
      VALUES (:studentId, :fullName, :semesterNo, :departmentId, :registrationStatus)
    `;
    
    try {
      // Get the parameters with proper names
      const params = {
        studentId: studentData.student_id,
        fullName: studentData.full_name,
        semesterNo: studentData.semester_no,
        departmentId: studentData.department_id,
        registrationStatus: studentData.registration_status || 'P'
      };

      
      await executeQuery(query, params);
      return studentData.student_id;
    } catch (error) {
      logger.error('Error creating student:', error);
      throw error;
    }
  },

  getStudentById: async (studentId, check = false) => {
    const query = `
      SELECT s.*, d.DEPARTMENT_NAME
      FROM SRRA.STUDENT s
      JOIN SRRA.DEPARTMENT d ON s.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE s.STUDENT_ID = :id
    `;
    try {
      const result = await executeQuery(query, { id: studentId });
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      return result.rows[0];
    } catch (error) {
      if (check) {
        return null;
      }
      logger.error('Error getting student:', error);
      throw error;
    }
  },

  updateStudent: async (studentId, studentData) => {
    const query = `
      UPDATE SRRA.STUDENT
      SET
        FULL_NAME = :fullName,
        SEMESTER_NO = :semesterNo,
        DEPARTMENT_ID = :departmentId,
        REGISTRATION_STATUS = :registrationStatus
      WHERE STUDENT_ID = :studentId
    `;
    try {
      await executeQuery(query, {
        fullName: studentData.full_name,
        semesterNo: studentData.semester_no,
        departmentId: studentData.department_id,
        registrationStatus: studentData.registration_status,
        studentId: studentId
      });
    } catch (error) {
      logger.error('Error updating student:', error);
      throw error;
    }
  },

  deleteStudent: async (studentId) => {
    const query = 'DELETE FROM SRRA.STUDENT WHERE STUDENT_ID = :id';
    try {
      await executeQuery(query, { id: studentId });
    } catch (error) {
      logger.error('Error deleting student:', error);
      throw error;
    }
  },
  
  getStudentsByDepartment: async (departmentId) => {
    const query = `
      SELECT * FROM SRRA.STUDENT 
      WHERE DEPARTMENT_ID = :id
      ORDER BY FULL_NAME ASC
    `;
    try {
      const result = await executeQuery(query, { id: departmentId });
      return result.rows;
    } catch (error) {
      logger.error('Error getting students by department:', error);
      throw error;
    }
  },
  
  searchStudents: async ({ q, department, status, limit = 20, offset = 0 }) => {
    let query = `
      SELECT s.*, d.DEPARTMENT_NAME
      FROM SRRA.STUDENT s
      JOIN SRRA.DEPARTMENT d ON s.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM SRRA.STUDENT s
      JOIN SRRA.DEPARTMENT d ON s.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE 1=1
    `;
    
    const params = {
      limit,
      offset
    };
    const countParams = {};

    if (q) {
        query += ' AND (s.FULL_NAME LIKE :searchName OR s.STUDENT_ID LIKE :searchId)';
        countQuery += ' AND (s.FULL_NAME LIKE :searchName OR s.STUDENT_ID LIKE :searchId)';
        const term = `%${q}%`;
        params.searchName = term;
        params.searchId = term;
        countParams.searchName = term;
        countParams.searchId = term;
    }

    if (department) {
      query += ' AND s.DEPARTMENT_ID = :departmentId';
      countQuery += ' AND s.DEPARTMENT_ID = :departmentId';
      params.departmentId = department;
    }

    if (status) {
      query += ' AND s.REGISTRATION_STATUS = :status';
      countQuery += ' AND s.REGISTRATION_STATUS = :status';
      params.status = status;
    }

    query += ' ORDER BY s.FULL_NAME ASC';
    
    const paginatedQuery = `
      SELECT * FROM (
        SELECT t.*, ROWNUM AS rn FROM (
          ${query}
        ) t
      ) WHERE rn > :offset AND rn <= :offset + :limit
    `;

    // Create separate params for count query
    
    if (params.status) {
      countParams.status = params.status;
    }

    console.log("query: ", query, "params", params);
    console.log("count query: ", countQuery, "countParams", countParams);

    try {
      const [result, countResult] = await Promise.all([
        executeQuery(paginatedQuery, params),
        executeQuery(countQuery, countParams)
      ]);

      console.log("res: ", {
        students: result,
        total: countResult.rows
      });
      
      return {
        students: result.rows,
        total: countResult.rows[0].total
      };
    } catch (error) {
      logger.error('Error searching students:', error);
      throw error;
    }
  },

  // Get total student count
  getStudentCount: async () => {
    const query = 'SELECT COUNT(*) AS COUNT FROM SRRA.STUDENT';
    try {
      const result = await executeQuery(query);
      return result.rows[0].COUNT;
    } catch (error) {
      logger.error('Error getting student count:', error);
      throw error;
    }
  },

  // Get students count by department
  getStudentsByDepartmentCount: async () => {
    const query = `
      SELECT 
        d.DEPARTMENT_NAME, 
        COUNT(s.STUDENT_ID) AS STUDENT_COUNT 
      FROM 
        SRRA.DEPARTMENT d
        LEFT JOIN SRRA.STUDENT s ON d.DEPARTMENT_ID = s.DEPARTMENT_ID
      GROUP BY 
        d.DEPARTMENT_ID, d.DEPARTMENT_NAME
      ORDER BY 
        STUDENT_COUNT DESC
    `;
    
    try {
      const result = await executeQuery(query);
      
      // Convert to object with department names as keys
      const departmentStats = {};
      result.rows.forEach(row => {
        departmentStats[row.DEPARTMENT_NAME] = row.STUDENT_COUNT;
      });
      
      return departmentStats;
    } catch (error) {
      logger.error('Error getting students by department count:', error);
      throw error;
    }
  }
};

module.exports = StudentModel;