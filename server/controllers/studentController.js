const StudentModel = require('../models/studentModel');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Get all students
const getAllStudents = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const { students, total } = await StudentModel.getAllStudents(limit, offset);
    successResponse(res, {
      students,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 200, 'Students retrieved successfully');
  } catch (error) {
    logger.error('Error getting students:', error);
    errorResponse(res, 'Error retrieving students', 500);
  }
};

// Create new student
const createStudent = async (req, res) => {
  const {
    studentId,
    fullName,
    semesterNo,
    departmentId,
    registrationStatus
  } = req.body;

  // Validate required fields
  if (!fullName || !semesterNo || !departmentId) {
    return errorResponse(res, 'Missing required fields', 400);
  }

  try {
    // Check if student ID was provided and exists
    if (studentId) {
      const existingStudent = await StudentModel.getStudentById(studentId, true);
      if (existingStudent) {
        return errorResponse(res, 'Student ID already exists', 409);
      }
    }

    // Generate student ID if not provided (use format S + unique timestamp)
    const student_id = studentId || ('S' + Date.now().toString().substring(3));
    
    const createdStudentId = await StudentModel.createStudent({
      student_id: student_id,
      full_name: fullName,
      semester_no: semesterNo,
      department_id: departmentId,
      registration_status: registrationStatus || 'P' // Default to Partially registered
    });
    
    successResponse(res, { student_id: createdStudentId }, 201, 'Student created successfully');
  } catch (error) {
    logger.error('Error creating student:', error);
    errorResponse(res, 'Error creating student', 500);
  }
};

// Get student by ID
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await StudentModel.getStudentById(id);
    successResponse(res, student, 200, 'Student retrieved successfully');
  } catch (error) {
    if (error.message === 'Student not found') {
      return errorResponse(res, 'Student not found', 404);
    }
    logger.error('Error getting student:', error);
    errorResponse(res, 'Error retrieving student', 500);
  }
};

// Update student
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    semesterNo,
    departmentId,
    registrationStatus
  } = req.body;

  // Validate required fields
  if (!fullName || !semesterNo || !departmentId || !registrationStatus) {
    return errorResponse(res, 'Missing required fields', 400);
  }

  try {
    await StudentModel.updateStudent(id, {
      full_name: fullName,
      semester_no: semesterNo,
      department_id: departmentId,
      registration_status: registrationStatus
    });
    
    successResponse(res, null, 200, 'Student updated successfully');
  } catch (error) {
    logger.error('Error updating student:', error);
    errorResponse(res, 'Error updating student', 500);
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    await StudentModel.deleteStudent(id);
    successResponse(res, null, 200, 'Student deleted successfully');
  } catch (error) {
    logger.error('Error deleting student:', error);
    if (error.message.includes('ORA-02292') || error.message.includes('integrity constraint')) {
      errorResponse(res, 'Cannot delete student - it is referenced by other records', 409);
    } else {
      errorResponse(res, 'Error student department', 500);
    }
  }
};

// Get students by department
const getStudentsByDepartment = async (req, res) => {
  const { departmentId } = req.params;

  try {
    const students = await StudentModel.getStudentsByDepartment(departmentId);
    successResponse(res, students, 200, 'Students retrieved successfully');
  } catch (error) {
    logger.error('Error getting students by department:', error);
    errorResponse(res, 'Error retrieving students', 500);
  }
};

// Search students
const searchStudents = async (req, res) => {
  const query = req.query.query || req.query.q || req.body.q || '';
  const { department, status, page = 1, limit = 20 } = { ...req.query, ...req.body };
  
  
  const offset = (page - 1) * limit;

  try {
    // التعامل مع البحث بمعرف طالب محدد
    if (query.length > 0 && !department && !status) {
      try {
        // التحقق مما إذا كان الاستعلام يطابق معرف طالب موجود
        const student = await StudentModel.getStudentById(query, true);
        if (student) {
          return successResponse(res, student, 200, 'Student found');
        }
      } catch (error) {
        // استمر في البحث إذا لم يتم العثور على طالب بهذا المعرف تماماً
        console.log('No exact match found, continuing with search');
      }
    }

    // إجراء البحث باستخدام الاستعلام
    const { students, total } = await StudentModel.searchStudents({
      q: query,
      department,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    successResponse(res, {
      students,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 200, 'Students retrieved successfully');
  } catch (error) {
    logger.error('Error searching students:', error);
    errorResponse(res, 'Error retrieving students', 500);
  }
};


// Get student statistics
const getStudentStats = async (req, res) => {
  try {
    // Get total count of students
    const totalStudents = await StudentModel.getStudentCount();
    
    // Get students by department
    const studentsByDepartment = await StudentModel.getStudentsByDepartmentCount();
    
    const stats = {
      total: totalStudents,
      byDepartment: studentsByDepartment
    };
    
    successResponse(res, stats, 200, 'Student statistics retrieved successfully');
  } catch (error) {
    logger.error('Error getting student statistics:', error);
    errorResponse(res, 'Error retrieving student statistics', 500);
  }
};

module.exports = {
  getAllStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByDepartment,
  searchStudents,
  getStudentStats
};