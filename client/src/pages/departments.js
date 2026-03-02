/**
 * Departments page module
 */
import { apiService } from '../services/apiService.js';
import './dashboard.js'; // Import dashboard.js for auth and header functionality

// Page configuration
const config = {
    title: 'Departments',
    isPublic: false
};

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
async function getContent() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    if (action === 'new' || action === 'add') {
        return getDepartmentForm();
    }
    
    if (action === 'edit') {
        const departmentId = new URLSearchParams(window.location.search).get('id');
        return getDepartmentForm(departmentId);
    }
    
    return getDepartmentsList();
}

/**
 * Get the department form HTML
 * @param {string} [departmentId] - Department ID to edit (optional)
 * @returns {Promise<string>} Form HTML
 */
async function getDepartmentForm(departmentId) {
    try {
      let departmentData = {};
      if (departmentId) {
        const department = await apiService.get(`/departments/${departmentId}`);
        departmentData = department.data;
      }
  
      const formHtml = `
        <div class="container" style="margin-top: 20px;">
          <h1 data-i18n="${departmentId ? 'editDepartmentHeading' : 'newDepartmentHeading'}">${departmentId ? 'Edit Department' : 'New Department'}</h1>
          <div class="form-container">
            <form id="departmentForm" class="form">
              ${departmentId ? `
                <div class="form-group">
                  <label for="departmentId" data-i18n="departmentIdLabel">Department ID</label>
                  <input type="text" id="departmentId" name="departmentId" value="${departmentData.DEPARTMENT_ID || ''}" readonly class="form-control">
                </div>
              ` : ''}
              <div class="form-group">
                <label for="departmentName" data-i18n="departmentName">Department Name</label>
                <input type="text" id="departmentName" name="departmentName" value="${departmentData.DEPARTMENT_NAME || ''}" required class="form-control">
                <small id="departmentNameHelp" class="form-text" data-i18n="departmentNameHelp">Official name of the department</small>
              </div>
              <div class="form-group">
                <label for="semestersNo" data-i18n="semestersNoLabel">Number of Semesters</label>
                <input type="number" id="semestersNo" name="semestersNo" value="${departmentData.SEMESTERS_NO || ''}" min="1" max="99" required class="form-control">
                <small id="semestersNoHelp" class="form-text" data-i18n="semestersNoHelp">Total number of semesters required to complete this department's program</small>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn ${departmentId ? 'btn-primary' : 'btn-primary'}" data-i18n="${departmentId ? 'save' : 'saveButton'}">${departmentId ? 'Save Changes' : 'Save'}</button>
                <button type="button" class="btn-secondary" onclick="window.location.href='?page=departments'" data-i18n="cancel${departmentId ? '' : 'Button'}">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      `;
  
      return formHtml;
    } catch (error) {
      console.error('Error loading department data:', error);
      return `
        <div class="container" style="margin-top: 20px;">
          <div class="error-message">
            <i class="fa fa-exclamation-circle"></i>
            ${error.message}
          </div>
        </div>
      `;
    }
  }

/**
 * Get the departments list HTML
 * @returns {string} List HTML
 */
function getDepartmentsList() {
    return `
        <div class="container" style="margin-top: 20px;">
            <div class="page-header">
                <h1 data-i18n="departmentsHeading">Department Management</h1>
                <button class="btn-primary" onclick="window.location.href='?page=departments&action=new'">
                    <i class="fa fa-plus"></i>
                    <span data-i18n="addDepartment">Add New Department</span>
                </button>
            </div>
            
            <div class="controls"></div>
            
            <div class="table-container">
                <table id="departmentsTable">
                    <thead>
                        <tr>
                            <th data-i18n="departmentIdColumnLabel">ID</th>
                            <th data-i18n="departmentNameColumnLabel">Name</th>
                            <th data-i18n="semestersNoColumnLabel">Semesters</th>
                            <th data-i18n="actionsColumnLabel">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="4" class="loading">
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
 * Initialize page functionality
 */
async function init() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    if (action === 'new' || action === 'add') {
        initDepartmentForm();
    } else if (action === 'edit') {
        const departmentId = new URLSearchParams(window.location.search).get('id');
        initDepartmentForm(departmentId);
    } else {
        await initDepartmentsList();
    }
}

/**
 * Initialize the department form
 * @param {string} [departmentId] - Department ID to edit (optional)
 */
async function initDepartmentForm(departmentId) {
    const form = document.getElementById('departmentForm');
    if (departmentId) {
        form.addEventListener('submit', (e) => handleDepartmentFormSubmit(e, departmentId));
    } else {
        form.addEventListener('submit', handleDepartmentFormSubmit);
    }
}

/**
 * Handle department form submission
 * @param {Event} e - Form submit event
 * @param {string} [departmentId] - Department ID to edit (optional)
 */
async function handleDepartmentFormSubmit(e, departmentId) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formContainer = document.querySelector('.form-container');
    
    // Disable the submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> ' + 
        (departmentId ? document.querySelector('[data-i18n="saving"]')?.textContent || 'Saving...' : 
                        document.querySelector('[data-i18n="creating"]')?.textContent || 'Creating...');
    
    if (formContainer) {
        formContainer.classList.add('loading-data');
    }
    
    try {
        // Validate required fields
        const departmentName = form.querySelector('#departmentName').value.trim();
        const semestersNo = form.querySelector('#semestersNo').value;
        
        if (!departmentName) {
            throw new Error('Department Name is required');
        }
        
        if (!semestersNo) {
            throw new Error('Number of Semesters is required');
        }
        
        const formData = new FormData(form);
        const data = {
            departmentName: formData.get('departmentName').trim(),
            semestersNo: parseInt(formData.get('semestersNo'), 10)
        };
        
        if (departmentId) {
            await apiService.put(`/departments/${departmentId}`, data);
            showSuccess('Department updated successfully');
        } else {
            await apiService.post('/departments', data);
            showSuccess('Department created successfully');
        }
        
        // Redirect back to departments list
        window.location.href = '?page=departments';
        
    } catch (error) {
        console.error('Error submitting department form:', error);
        
        // Show error message
        if (error.message.includes('Department Name')) {
            showError('Department Name is required');
        } else if (error.message.includes('Number of Semesters')) {
            showError('Number of Semesters is required');
        } else {
            showError(departmentId ? 'Failed to update department' : 'Failed to create department');
        }
        
        // Restore submit button state
        submitButton.disabled = false;
        submitButton.innerHTML = departmentId ? 
            (document.querySelector('[data-i18n="save"]')?.textContent || 'Save Changes') : 
            (document.querySelector('[data-i18n="saveButton"]')?.textContent || 'Save');
        
        if (formContainer) {
            formContainer.classList.remove('loading-data');
        }
    }
}

/**
 * Initialize the departments list
 */
async function initDepartmentsList() {
    try {
        // Load initial data
        
        // Apply translations
        if (window.applyTranslations) {
            window.applyTranslations();
        }
        
        // Load initial data
        await loadDepartments();
        
    } catch (error) {
        console.error('Error initializing departments list:', error);
        showError('Failed to initialize departments page. Please refresh and try again.');
    }
}

/**
 * Load departments with current filters
 */
async function loadDepartments() {
    const tbody = document.querySelector('#departmentsTable tbody');
    const tableContainer = document.querySelector('.table-container');
    
    // Show loading state
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="loading">
                    <span class="spinner"></span>
                    <span data-i18n="loading">Loading...</span>
                </td>
            </tr>
        `;
    }
    
    // Add loading overlay to the table container
    if (tableContainer) {
        tableContainer.classList.add('loading-data');
    }
    
    try {
        const response = await apiService.get('/departments');
        const departments = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
        
        // Remove loading state
        if (tableContainer) {
            tableContainer.classList.remove('loading-data');
        }
        
        displayDepartments(departments);
        
        // Apply translations to the newly inserted content
        if (window.applyTranslations) {
            window.applyTranslations();
        }
        
    } catch (error) {
        console.error('Error loading departments:', error);
        
        // Remove loading state
        if (tableContainer) {
            tableContainer.classList.remove('loading-data');
        }
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="error-message">
                        <i class="fa fa-exclamation-circle"></i>
                        <span data-i18n="errorLoadingDepartments">Error loading departments</span>
                    </td>
                </tr>
            `;
        }
        
        // Apply translations to the error message
        if (window.applyTranslations) {
            window.applyTranslations();
        }
        
        showError('Error loading departments');
    }
}

/**
 * Display departments in the table
 * @param {Array} departments - List of departments
 */
function displayDepartments(departments) {
    const tbody = document.querySelector('#departmentsTable tbody');
    
    if (!departments || departments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-message">
                    <i class="fa fa-info-circle"></i>
                    <span data-i18n="noDepartmentsFound">No departments found</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = departments.map(dept => `
        <tr>
            <td>${dept.DEPARTMENT_ID}</td>
            <td>${dept.DEPARTMENT_NAME}</td>
            <td>${dept.SEMESTERS_NO}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="window.location.href='?page=departments&action=edit&id=${dept.DEPARTMENT_ID}'" aria-label="Edit department">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn-danger btn-sm" onclick="deleteDepartment('${dept.DEPARTMENT_ID}')" aria-label="Delete department">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Delete a department
 * @param {number} id - Department ID
 */
async function deleteDepartment(id) {
    if (!confirm(document.querySelector('[data-i18n="confirmDeleteDepartment"]')?.textContent || 'Are you sure you want to delete this department?')) {
        return;
    }
    let res
    try {
        res = await apiService.delete(`/departments/${id}`);
        if (res.status === 409) {
            console.log("conflict");
            showError('Cannot delete department - it is referenced by other some students');
        }
        if (res.status === 200){
            showSuccess('Department deleted successfully');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
        
    } catch (error) {
        console.error('Error deleting department:', error);
        
        showError('Failed to delete department');
        
    }
}

/**
 * Show a success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    
    // Check if the message should be translated
    const translatedMessage = getTranslatedSuccessMessage(message);
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${translatedMessage}`;
    
    // Add to container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
}

/**
 * Get translated success message if possible
 * @param {string} message - Original message
 * @returns {string} Translated or original message
 */
function getTranslatedSuccessMessage(message) {
    // Common success messages for translation
    const successMessages = {
        'Department created successfully': '<span data-i18n="itemCreatedSuccess">Item created successfully</span>',
        'Department updated successfully': '<span data-i18n="itemUpdatedSuccess">Item updated successfully</span>',
        'Department deleted successfully': '<span data-i18n="itemDeletedSuccess">Item deleted successfully</span>'
    };
    
    return successMessages[message] || message;
}

/**
 * Show an error message
 * @param {string} message - Error message
 */
function showError(message) {
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    
    // Check if the message should be translated
    const translatedMessage = getTranslatedErrorMessage(message);
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${translatedMessage}`;
    
    // Add to container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

/**
 * Get translated error message if possible
 * @param {string} message - Original message
 * @returns {string} Translated or original message
 */
function getTranslatedErrorMessage(message) {
    // Common error messages for translation
    const errorMessages = {
        'Failed to load departments data': '<span data-i18n="itemLoadError">Error loading data</span>',
        'Failed to initialize departments page. Please refresh and try again.': '<span data-i18n="itemLoadError">Error loading data</span>',
        'Failed to delete department': '<span data-i18n="itemDeleteError">Failed to delete item</span>',
        'Failed to create department': '<span data-i18n="itemCreateError">Failed to create item</span>',
        'Failed to update department': '<span data-i18n="itemUpdateError">Failed to update item</span>',
        'Department Name is required': '<span data-i18n="required">This field is required</span>',
        'Department ID is required': '<span data-i18n="required">This field is required</span>',
        'Number of Semesters is required': '<span data-i18n="required">This field is required</span>',
        'Error loading departments': '<span data-i18n="itemLoadError">Error loading data</span>',
        'Cannot delete department - it is referenced by other records': '<span data-i18n="itemReferenceError">Cannot delete - item is referenced by other records</span>'
    };
    
    return errorMessages[message] || message;
}

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export page module
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init
};

// Expose deleteDepartment to global scope for inline handlers
window.deleteDepartment = deleteDepartment;