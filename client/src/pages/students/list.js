/**
 * وحدة قائمة الطلاب
 * تحتوي على وظائف تحميل وعرض قائمة الطلاب
 */

import { apiService } from '../../services/apiService.js';
import { showSuccess, showError } from './ui.js';

// متغيرات التصفح
let currentPage = 1;
let pageSize = 10;
let isInitialLoad = true;

/**
 * تحميل قائمة الطلاب من API
 * @param {number} page رقم الصفحة
 * @param {number} size حجم الصفحة
 */
async function loadStudents(page = 1, size = 10) {
    currentPage = page;
    pageSize = size;
    
    try {
        const response = await apiService.get(`/students?page=${page}&size=${size}`);
        const { students, totalRecords } = response.data;
        
        displayStudents(students);
        setupPagination(totalRecords, size, page);
    } catch (error) {
        console.error('Error loading students:', error);
        const tbody = document.querySelector('#studentsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-data">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span data-i18n="failedToLoadStudents">Failed to load students</span>
                </td>
            </tr>
        `;
    }
}

/**
 * إعداد ترقيم الصفحات
 * @param {number} totalRecords إجمالي عدد السجلات
 * @param {number} size حجم الصفحة
 * @param {number} currentPage الصفحة الحالية
 */
function setupPagination(totalRecords, size, currentPage) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalRecords / size);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // زر الصفحة السابقة
    html += `
        <button class="btn-pagination ${currentPage === 1 ? 'disabled' : ''}" 
            ${currentPage === 1 ? 'disabled' : `onclick="window.loadStudentsPage(${currentPage - 1})"`}>
            <i class="fa fa-chevron-left"></i>
        </button>
    `;
    
    // أزرار الصفحات
    const maxPagesToShow = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="btn-pagination ${i === currentPage ? 'active' : ''}" 
                onclick="window.loadStudentsPage(${i})">
                ${i}
            </button>
        `;
    }
    
    // زر الصفحة التالية
    html += `
        <button class="btn-pagination ${currentPage === totalPages ? 'disabled' : ''}" 
            ${currentPage === totalPages ? 'disabled' : `onclick="window.loadStudentsPage(${currentPage + 1})"`}>
            <i class="fa fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

/**
 * عرض قائمة الطلاب في الجدول
 * @param {Array} students قائمة بيانات الطلاب
 */
function displayStudents(students) {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data" data-i18n="noStudentsFound">No students found</td>
            </tr>
        `;
        return;
    }   

    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.STUDENT_ID}</td>
            <td>${student.FULL_NAME}</td>
            <td>${student.SEMESTER_NO}</td>
            <td>${student.DEPARTMENT_NAME}</td>
            <td><span data-i18n="${student.registration_Status === 'F' ? 'fullyRegisteredStatus' : 'partiallyRegisteredStatus'}">${student.REGISTRATION_STATUS === 'F' ? 'Fully Registered' : 'Partially Registered'}</span></td>
            <td>
                <button class="btn-secondary btn-sm" onclick="window.location.href='?page=students&action=edit&id=${student.STUDENT_ID}'">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn-danger btn-sm" onclick="window.deleteStudent('${student.STUDENT_ID}')">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * تهيئة قائمة الطلاب
 */
function initStudentsList() {
    // إتاحة دالة تحميل الصفحة عالميًا
    window.loadStudentsPage = (page) => loadStudents(page, pageSize);
    
    // تحميل البيانات الأولية
    loadStudents(currentPage, pageSize);
}

/**
 * حذف طالب
 * @param {number} id معرف الطالب
 */
async function deleteStudent(id) {
    if (!confirm(document.querySelector('[data-i18n="confirmDeleteStudent"]')?.textContent || 'هل أنت متأكد من رغبتك في حذف هذا الطالب؟')) {
        return;
    }
    let res
    try {
        res = await apiService.delete(`/students/${id}`);
        if(res.status === 409){
            console.log("conflict")
            showError("Cannot delete student - it is referenced by other records");
        }
        if(res.status === 200){
            showSuccess(document.querySelector('[data-i18n="studentDeletedSuccess"]')?.textContent || 'تم حذف الطالب بنجاح');
            
            // إعادة تحميل الصفحة بعد الحذف الناجح
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showError(document.querySelector('[data-i18n="failedToDeleteStudent"]')?.textContent || 'فشل في حذف الطالب');
    }
}

// تصدير الوظائف
export {
    loadStudents,
    displayStudents,
    initStudentsList,
    deleteStudent
}; 