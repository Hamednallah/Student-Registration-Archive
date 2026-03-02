/**
 * وحدة نماذج الطلاب
 * تحتوي على وظائف لإدارة نماذج إضافة وتعديل بيانات الطلاب
 */

import { apiService } from '../../services/apiService.js';
import { showSuccess, showError, toggleFormProcessing } from './ui.js';

/**
 * الحصول على نموذج الطالب (للإضافة أو التعديل)
 * @param {string|null} studentId معرف الطالب للتعديل (يمرر فقط في حالة التعديل)
 * @returns {string} محتوى HTML للنموذج
 */
function getStudentForm(studentId = null) {
    const isEditMode = !!studentId;
    
    return `
        <div class="container" style="margin-top: 20px;">
            <div class="page-header">
                <h1 data-i18n="${isEditMode ? 'editStudent' : 'addStudent'}">${isEditMode ? 'Edit Student' : 'Add New Student'}</h1>
                
            </div>
            
            <div class="card">
                <div class="card-body">
                    <form id="studentForm" class="form">
                        <div class="form-group">
                            <label for="studentId" data-i18n="studentIdLabel">Student ID</label>
                            <input type="text" id="studentId" name="studentId" class="form-control" ${isEditMode ? 'readonly' : 'required'}>
                            <small class="form-text text-muted" data-i18n="studentIdHelp">Unique identifier for the student</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="fullName" data-i18n="fullNameLabel">Full Name</label>
                            <input type="text" id="fullName" name="fullName" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="semesterNo" data-i18n="semesterNoLabel">Semester Number</label>
                            <select id="semesterNo" name="semesterNo" class="form-control" required>
                                <option value="" selected disabled data-i18n="selectSemester">Select Semester</option>
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => 
                                    `<option value="${n}">${n}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="departmentId" data-i18n="departmentLabel">Department</label>
                            <select id="departmentId" name="departmentId" class="form-control" ${isEditMode ? 'disabled' : 'required'}>
                                <option value="" selected disabled data-i18n="selectDepartment">Select Department</option>
                                <!-- Will be populated dynamically -->
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="registrationStatus" data-i18n="registrationStatusLabel">Registration Status</label>
                            <select id="registrationStatus" name="registrationStatus" class="form-control" required>
                                <option value="" selected disabled data-i18n="selectStatus">Select Status</option>
                                <option value="F" data-i18n="fullyRegisteredStatus">Fully Registered</option>
                                <option value="P" data-i18n="partiallyRegisteredStatus">Partially Registered</option>
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <span data-i18n="save">save</span>
                            </button>
                            <button type="button" class="btn-secondary" onclick="window.location.href='?page=students'">
                                <span data-i18n="cancel">Cancel</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

/**
 * تهيئة نموذج إضافة طالب جديد
 */
async function initNewStudentForm() {
    const form = document.getElementById('studentForm');
    
    if (!form) {
        showError('Failed to initialize the form. Please refresh the page and try again.');
        return;
    }
    
    // تحميل قائمة الأقسام
    await loadDepartments();
    
    // Remove any existing submit handlers first
    form.removeEventListener('submit', handleNewStudent);
    
    // Add new submit handler with proper event handling
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleNewStudent(e);
    });
}

/**
 * تهيئة نموذج تعديل بيانات طالب
 * @param {string} studentId معرف الطالب
 */
async function initEditStudentForm(studentId) {
    const form = document.getElementById('studentForm');
    
    if (!form) {
        showError('Failed to initialize the form. Please refresh the page and try again.');
        return;
    }
    
    // تحميل قائمة الأقسام
    await loadDepartments();
    
    // تحميل بيانات الطالب
    try {
        toggleFormProcessing(true);
        const response = await apiService.get(`/students/${studentId}`);
        
        if (!response.data) {
            throw new Error('Student not found');
        }
        
        const student = response.data;

        // تعبئة النموذج ببيانات الطالب
        document.getElementById('studentId').value = student.STUDENT_ID;
        document.getElementById('fullName').value = student.FULL_NAME;
        document.getElementById('semesterNo').value = student.SEMESTER_NO;
        document.getElementById('departmentId').value = student.DEPARTMENT_ID;
        document.getElementById('registrationStatus').value = student.REGISTRATION_STATUS;
        
        // إضافة معالج الحدث لتقديم النموذج
        form.addEventListener('submit', (e) => handleEditStudent(e, studentId));
        
    } catch (error) {
        console.error('Error loading student data:', error);
        showError('Failed to load student data. Please try again.');
    } finally {
        toggleFormProcessing(false);
    }
}

/**
 * تحميل قائمة الأقسام
 */
async function loadDepartments() {
    try {
        const response = await apiService.get('/departments');
        const departments = response.data;
        
        if (!Array.isArray(departments)) {
            throw new Error('Invalid departments data');
        }
        
        const select = document.getElementById('departmentId');
        
        if (select && departments.length > 0) {
            // الاحتفاظ بالخيار الأول (placeholder)
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = '';
            
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            // إضافة خيارات الأقسام
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.DEPARTMENT_ID || dept.id;
                option.textContent = dept.DEPARTMENT_NAME || dept.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        showError('Failed to load departments list');
    }
}

/**
 * معالجة تقديم نموذج إضافة طالب جديد
 * @param {Event} e حدث التقديم
 */
async function handleNewStudent(e) {
    // Get form element first
    const form = document.getElementById('studentForm');
    
    // Prevent default only after getting form data
    try {
        toggleFormProcessing(true);
        if (!form) {
            console.error('Form element not found');
            throw new Error('Form submission failed - form not found');
        }
        
        // Verify form is HTMLFormElement
        if (!(form instanceof HTMLFormElement)) {
            console.error('Element is not a form:', form);
            throw new Error('Form submission failed - invalid form element');
        }
        
        // Verify form fields exist and get form data from from
        const fields = ['studentId', 'fullName', 'semesterNo', 'departmentId', 'registrationStatus'];
        const formData = {};
        fields.forEach(field => {
            const element = form.elements[field];
            if (!element) {
                console.error(`Form field ${field} not found`);
            } else {
                formData[`${field}`] = element.value;
            }
        });
    
        const data = {
            studentId: formData.studentId,
            fullName: formData.fullName,
            semesterNo: parseInt(formData.semesterNo, 10),
            departmentId: formData.departmentId,
            registrationStatus: formData.registrationStatus
        };

        // التحقق من البيانات
        if (!data.studentId || !data.fullName || !data.semesterNo || !data.departmentId || !data.registrationStatus) {
            throw new Error('All fields are required');
        }
        
        e.preventDefault(); // Ensure form doesn't submit normally
        
        let res;
        try {
            res = await apiService.post('/students/new', data);
            
            if (res.status === 409) {
                showError(res.data.error || 'Student ID already exists');
                return false; // Prevent further execution
            }
            
            if (!res || !res.data) {
                console.error('Invalid response format:', res);
                throw new Error('Invalid API response format');
            }

            showSuccess('Student created successfully');
            window.location.href = '?page=students';
            return true;
        } catch (error) {
            console.error('Form submission failed:', {
                error: error,
                stack: error.stack
            });
            showError(error.message || 'Failed to create student');
            return false;
        }
       
        
    } catch (error) {
        console.error('Error creating student:', error);
        showError(error.message || 'Failed to create student');
    } finally {
        toggleFormProcessing(false);
    }
}

/**
 * معالجة تقديم نموذج تعديل بيانات طالب
 * @param {Event} e حدث التقديم
 * @param {string} studentId معرف الطالب
 */
async function handleEditStudent(e, studentId) {
    // Get form element first
    const form = document.getElementById('studentForm');

    try{
        toggleFormProcessing(true);
        if (!form) {
            console.error('Form element not found');
            throw new Error('Form submission failed - form not found');
        }
        
        // Verify form is HTMLFormElement
        if (!(form instanceof HTMLFormElement)) {
            console.error('Element is not a form:', form);
            throw new Error('Form submission failed - invalid form element');
        }
        
        // Verify form fields exist and get form data from from
        const fields = ['studentId', 'fullName', 'semesterNo', 'departmentId', 'registrationStatus'];
        const formData = {};
        fields.forEach(field => {
            const element = form.elements[field];
            if (!element) {
                console.error(`Form field ${field} not found`);
            } else {
                formData[`${field}`] = element.value;
            }
        });

    
        const data = {
            studentId: formData.studentId,
            fullName: formData.fullName,
            semesterNo: parseInt(formData.semesterNo, 10),
            departmentId: formData.departmentId,
            registrationStatus: formData.registrationStatus
        };
        
        // التحقق من البيانات
        if (!data.fullName || !data.semesterNo || !data.departmentId || !data.registrationStatus) {
            throw new Error('All fields are required');
        }
        
        
        e.preventDefault(); // Ensure form doesn't submit normally
        
        let res;
        try {
            res = await apiService.put(`/students/${studentId}`, data);
            
            if (!res || !res.success) {
                console.error('Invalid response format:', res);
                throw new Error('Invalid API response format');
            }

            showSuccess('Student updated successfully');
            window.location.href = '?page=students';
            return true;
        } catch (error) {
            console.error('Form submission failed:', {
                error: error,
                stack: error.stack
            });
            showError(error.message || 'Failed to update student');
            return false;
        }
        
 
    } catch (error) {
        console.error('Error updating student:', error);
        showError(error.message || 'Failed to update student');
    } finally {
        toggleFormProcessing(false);
    }
}

// تصدير الوظائف
export {
    getStudentForm,
    initNewStudentForm,
    initEditStudentForm,
    handleNewStudent,
    handleEditStudent
}; 
