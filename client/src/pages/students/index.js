/**
 * Students module index
 * مؤشر وحدة إدارة الطلاب
 */

// استيراد المكونات
import { apiService } from '../../services/apiService.js';
import '../dashboard.js'; // Import dashboard.js for auth and header functionality

// إعدادات الصفحة
const config = {
    title: 'Students',
    isPublic: false
};

// الدوال المساعدة التي سيتم تصديرها
import { loadStudents, initStudentsList, displayStudents, deleteStudent } from './list.js';
import { getStudentForm, initNewStudentForm, initEditStudentForm, handleNewStudent, handleEditStudent } from './form.js';

/**
 * الحصول على محتوى الصفحة
 * @returns {Promise<string>} محتوى HTML
 */
async function getContent() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    if (action === 'new' || action === 'add') {
        return getStudentForm();
    }
    
    if (action === 'edit') {
        const studentId = new URLSearchParams(window.location.search).get('id');
        return getStudentForm(studentId);
    }
    
    return getStudentsList();
}

/**
 * الحصول على قائمة الطلاب بتنسيق HTML
 * @returns {string} محتوى HTML للقائمة
 */
function getStudentsList() {
    return `
        <style>
            .empty-message {
                text-align: center;
                color: #666;
                padding: 20px;
            }
            .empty-message i {
                margin-right: 5px;
                color: #999;
            }
        </style>
        <div class="container" style="margin-top: 20px;">
            <div class="page-header">
                <h1 data-i18n="studentsHeading">Student Management</h1>
                <button class="btn-primary" onclick="window.location.href='?page=students&action=new'">
                    <i class="fa fa-plus"></i>
                    <span data-i18n="addStudent">Add New Student</span>
                </button>
            </div>
            
            <div class="table-container">
                <table id="studentsTable">
                    <thead>
                        <tr>
                            <th data-i18n="studentIdLabel">ID</th>
                            <th data-i18n="fullNameLabel">Full Name</th>
                            <th data-i18n="semesterNoLabel">Semester</th>
                            <th data-i18n="departmentLabel">Department</th>
                            <th data-i18n="registrationStatusLabel">Status</th>
                            <th data-i18n="actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="loading">
                                <span class="spinner"></span>
                                <span data-i18n="loading">Loading...</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="pagination" id="pagination"></div>
        </div>
    `;
}

/**
 * تهيئة وظائف الصفحة
 */
async function init() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    // جعل دالة حذف الطالب متاحة عالمياً
    window.deleteStudent = deleteStudent;
    
    if (action === 'new' || action === 'add') {
        await initNewStudentForm();
    } else if (action === 'edit') {
        const studentId = new URLSearchParams(window.location.search).get('id');
        await initEditStudentForm(studentId);
    } else {
        await initStudentsList();
    }
}

// تصدير وحدة الصفحة
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init
}; 