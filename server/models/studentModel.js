const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const StudentModel = {
  getAllStudents: async (limit = 20, offset = 0) => {
    const query = `
    SELECT 
      STUDENT.STUDENT_ID,
      STUDENT.FULL_NAME,
      STUDENT.DEPARTMENT_ID,
      STUDENT.SEMESTER_NO,
      STUDENT.REGISTRATION_STATUS,
      DEPARTMENT.DEPARTMENT_NAME
    FROM STUDENT
    JOIN DEPARTMENT 
      ON STUDENT.DEPARTMENT_ID = DEPARTMENT.DEPARTMENT_ID
    ORDER BY STUDENT.FULL_NAME ASC
  ${(process.env.NODE_ENV === 'development' ?
        'LIMIT ? OFFSET ?' : 'OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY')}`;

    const countQuery = `
    SELECT COUNT(*) AS total
    FROM STUDENT
    JOIN DEPARTMENT 
      ON STUDENT.DEPARTMENT_ID = DEPARTMENT.DEPARTMENT_ID
  `;

    try {
      const [result, countResult] = await Promise.all([
        executeQuery(query, [limit, offset]),
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
      SELECT SRRA.STUDENT.*, SRRA.DEPARTMENT.DEPARTMENT_NAME
      FROM SRRA.STUDENT 
      JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
      WHERE SRRA.STUDENT.STUDENT_ID = :id
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
      SELECT SRRA.STUDENT.*, SRRA.DEPARTMENT.DEPARTMENT_NAME
      FROM SRRA.STUDENT 
      JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM SRRA.STUDENT 
      JOIN SRRA.DEPARTMENT ON SRRA.STUDENT.DEPARTMENT_ID = SRRA.DEPARTMENT.DEPARTMENT_ID
      WHERE 1=1
    `;

    const params = {
      limit,
      offset
    };
    const countParams = {};

    if (q) {
      query += ' AND (SRRA.STUDENT.FULL_NAME LIKE :searchName OR SRRA.STUDENT.STUDENT_ID LIKE :searchId)';
      countQuery += ' AND (SRRA.STUDENT.FULL_NAME LIKE :searchName OR SRRA.STUDENT.STUDENT_ID LIKE :searchId)';
      const term = `%${q}%`;
      params.searchName = term;
      params.searchId = term;
      countParams.searchName = term;
      countParams.searchId = term;
    }

    if (department) {
      query += ' AND SRRA.STUDENT.DEPARTMENT_ID = :departmentId';
      countQuery += ' AND SRRA.STUDENT.DEPARTMENT_ID = :departmentId';
      params.departmentId = department;
    }

    if (status) {
      query += ' AND SRRA.STUDENT.REGISTRATION_STATUS = :status';
      countQuery += ' AND SRRA.STUDENT.REGISTRATION_STATUS = :status';
      params.status = status;
    }

    query += ' ORDER BY SRRA.STUDENT.FULL_NAME ASC';

    const paginatedQuery = `
      SELECT * FROM (
        SELECT SRRA.STUDENT.*, ROWNUM AS rn FROM (
          ${query}
        ) SRRA.STUDENT
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
        SRRA.DEPARTMENT.DEPARTMENT_NAME, 
        COUNT(SRRA.STUDENT.STUDENT_ID) AS STUDENT_COUNT 
      FROM 
        SRRA.DEPARTMENT 
        LEFT JOIN SRRA.STUDENT ON SRRA.DEPARTMENT.DEPARTMENT_ID = SRRA.STUDENT.DEPARTMENT_ID
      GROUP BY 
        SRRA.DEPARTMENT.DEPARTMENT_ID, SRRA.DEPARTMENT.DEPARTMENT_NAME
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