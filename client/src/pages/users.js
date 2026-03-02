/**
 * Users page module
 */
import { apiService } from '../services/apiService.js';
import './dashboard.js'; // Import dashboard.js for auth and header functionality

// Page configuration
const config = {
    title: 'Users',
    isPublic: false
};

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
async function getContent() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    if (action === 'new' || action === 'add') {
        return getUserForm();
    }
    
    if (action === 'edit') {
        const userId = new URLSearchParams(window.location.search).get('id');
        return getUserForm(userId);
    }
    
    return getUsersList();
}

/**
 * Get the user form HTML
 * @param {string} [userId] - User ID to edit (optional)
 * @returns {Promise<string>} Form HTML
 */
async function getUserForm(userId) {
    try {
      let userData = {};
      let isEdit = !!userId;
  
      if (isEdit) {
        const user = await apiService.get(`/users/${userId}`);
        userData = user.data;
      }
  
      const formHtml = `
        <div class="container" style="margin-top: 20px;">
          <h1 data-i18n="${isEdit ? 'editUserHeading' : 'newUserHeading'}">${isEdit ? 'Edit User' : 'New User'}</h1>
          <div class="form-container">
            <form id="userForm" class="form">
              ${isEdit ? `
                <div class="form-group">
                  <label for="userId" data-i18n="userIdLabel">User ID</label>
                  <input type="text" id="userId" name="userId" value="${userData.USER_ID || ''}" readonly class="form-control">
                </div>
              ` : `
                <div class="form-group">
                  <label for="userId" data-i18n="userIdLabel">User ID</label>
                  <input type="text" id="userId" name="userId" maxlength="15" required class="form-control">
                  <small class="help-text" data-i18n="userIdHelp">Enter a unique identifier (max 15 characters)</small>
                </div>
              `}
              <div class="form-group">
                <label for="username" data-i18n="userNameLabel">Username</label>
                <input type="text" id="username" name="username" value="${userData.USER_NAME || ''}" minlength="3" maxlength="200" required class="form-control">
                <small class="help-text" data-i18n="usernameHelp">Between 3-200 characters</small>
              </div>
              <div class="form-group">
                <label for="password" data-i18n="passwordLabel">Password</label>
                <input type="password" id="password" name="password" minlength="8" maxlength="50" required class="form-control">
                <small class="help-text" data-i18n="passwordHelp">At least 8 characters with lowercase, uppercase, number and special character</small>
              </div>
              <div class="form-group">
                <label for="confirmPassword" data-i18n="confirmPasswordLabel">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required class="form-control">
              </div>
              <div class="form-group">
                <label data-i18n="userRoleLabel">User Role</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="radio" name="role" value="U" ${userData.ROLE === 'U' || !isEdit ? 'checked' : ''}>
                    <span data-i18n="userRoleOption">Regular User (U)</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="radio" name="role" value="A" ${userData.ROLE === 'A' ? 'checked' : ''}>
                    <span data-i18n="adminRoleOption">Administrator (A)</span>
                  </label>
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn ${isEdit ? 'btn-primary' : 'btn-primary'}" data-i18n="save${isEdit ? '' : 'Button'}">${isEdit ? 'Save Changes' : 'Save'}</button>
                <button type="button" class="btn-secondary" onclick="window.location.href='?page=users'" data-i18n="cancel${isEdit ? '' : 'Button'}">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      `;
  
      return formHtml;
    } catch (error) {
      console.error('Error loading user data:', error);
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
 * Get the users list HTML
 * @returns {string} List HTML
 */
function getUsersList() {
    return `
        <style>
            .search-box {
                position: relative;
                width: 100%;
            }
            .clear-search {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
            }
            .reset-filter {
                margin-left: 8px;
                padding: 3px 8px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            .reset-filter:hover {
                background: #eee;
            }
            .empty-message {
                text-align: center;
                color: #666;
                padding: 20px;
            }
            .empty-message i {
                margin-right: 5px;
                color: #999;
            }
            .filter-loading {
                display: inline-block;
                margin-left: 8px;
            }
            .spinner-sm {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: #09f;
                animation: spin 1s linear infinite;
            }
        </style>
        <div class="container" style="margin-top: 20px;">
            <div class="page-header">
                <h1 data-i18n="usersHeading">User Management</h1>
                <button class="btn-primary" onclick="window.location.href='?page=users&action=new'">
                    <i class="fa fa-plus"></i>
                    <span data-i18n="addUser">Add New User</span>
                </button>
            </div>
            
            <div class="controls"></div>
            
            <div class="table-container">
                <table id="usersTable">
                    <thead>
                        <tr>
                            <th data-i18n="userIdColumnLabel">ID</th>
                            <th data-i18n="userNameColumnLabel">Username</th>
                            <th data-i18n="userRoleColumnLabel">Role</th>
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
    
    // Make deleteUser available globally
    window.deleteUser = deleteUser;
    
    if (action === 'new' || action === 'add') {
        initUserForm();
    } else if (action === 'edit') {
        const userId = new URLSearchParams(window.location.search).get('id');
        initUserForm(userId);
    } else {
        await initUsersList();
    }
}

/**
 * Initialize the user form
 * @param {string} [userId] - User ID to edit (optional)
 */
async function initUserForm(userId) {
    const form = document.getElementById('userForm');
    if (userId) {
        form.addEventListener('submit', (e) => handleUserFormSubmit(e, userId));
    } else {
        form.addEventListener('submit', handleUserFormSubmit);
    }
}

/**
 * Handle user form submission
 * @param {Event} e - Form submit event
 * @param {string} [userId] - User ID to edit (optional)
 */
async function handleUserFormSubmit(e, userId) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    try {
        const formData = new FormData(form);
        const data = {
            userId: formData.get('userId'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role')
        };
        
        if (userId) {
            await apiService.put(`/users/${userId}`, data);
        } else {
            await apiService.post('/users', data);
        }
        
        window.location.href = '?page=users';
        showSuccess(userId ? 'User updated successfully' : 'User created successfully');
        
    } catch (error) {
        console.error('Error submitting user form:', error);
        showError(error.message);
        submitButton.disabled = false;
    }
}

/**
 * Initialize the users list
 */
async function initUsersList() {
    // Initial load
    loadUsers();
    
    // Load initial data
    loadUsers();
}

/**
 * Load users with current filters
 */
async function loadUsers(isSearchOrFilter = false) {
    const tbody = document.querySelector('#usersTable tbody');
    const tableContainer = document.querySelector('.table-container');
    
    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="loading">
                <span class="spinner"></span>
                <span data-i18n="loading">Loading...</span>
            </td>
        </tr>
    `;
    
    tableContainer.classList.add('loading-data');
    
    try {
        const response = await apiService.get('/users');
        const users = response.data;
        tableContainer.classList.remove('loading-data');
        
        // Handle empty results
        if (users.length === 0) {
            if (isSearchOrFilter) {
                showError(document.querySelector('[data-i18n="noSearchResults"]')?.textContent || 'No results found');
            }
        }
        
        displayUsers(users);
        
    
        
    } catch (error) {
        console.error('Error loading users:', error);
        tableContainer.classList.remove('loading-data');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="error-message">
                    <i class="fa fa-exclamation-circle"></i>
                    <span data-i18n="errorLoadingUsers">Error loading users</span>
                </td>
            </tr>
        `;
        showError(document.querySelector('[data-i18n="errorLoadingUsers"]')?.textContent || 'Failed to load users data');
    }
}

/**
 * Display users in the table
 * @param {Array} users - List of users
 */
function displayUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-message">
                    <i class="fa fa-info-circle"></i>
                    <span data-i18n="noUsers">No users found</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.USER_ID}</td>
            <td>${user.USER_NAME}</td>
            <td><span data-i18n="${user.ROLE === 'A' ? 'adminRoleOption' : 'userRoleOption'}">${user.ROLE === 'A' ? 'Admin (A)' : 'User (U)'}</span></td>
            <td>
                <button class="btn-secondary btn-sm" onclick="window.location.href='?page=users&action=edit&id=${user.USER_ID}'" aria-label="Edit user">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn-danger btn-sm" onclick="window.deleteUser('${user.USER_ID}')" aria-label="Delete user">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Delete a user
 * @param {string} id - User ID
 */
async function deleteUser(id) {
    if (!confirm(document.querySelector('[data-i18n="confirmDeleteUser"]')?.textContent || 'Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await apiService.delete(`/users/${id}`);
        showSuccess(document.querySelector('[data-i18n="userDeletedSuccess"]')?.textContent || 'User deleted successfully');
        
        // إعادة تحميل الصفحة بعد الحذف الناجح
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error deleting user:', error);
        showError(document.querySelector('[data-i18n="failedToDeleteUser"]')?.textContent || 'Failed to delete user');
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
        'User created successfully': '<span data-i18n="itemCreatedSuccess">Item created successfully</span>',
        'User updated successfully': '<span data-i18n="itemUpdatedSuccess">Item updated successfully</span>',
        'User deleted successfully': '<span data-i18n="itemDeletedSuccess">Item deleted successfully</span>'
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
        'Failed to load users data': '<span data-i18n="itemLoadError">Error loading data</span>',
        'Failed to initialize users page. Please refresh and try again.': '<span data-i18n="itemLoadError">Error loading data</span>',
        'Failed to delete user': '<span data-i18n="itemDeleteError">Failed to delete item</span>',
        'Failed to create user': '<span data-i18n="itemCreateError">Failed to create item</span>',
        'Failed to update user': '<span data-i18n="itemUpdateError">Failed to update item</span>',
        'User ID is required': '<span data-i18n="required">This field is required</span>',
        'Username is required': '<span data-i18n="required">This field is required</span>',
        'Password is required': '<span data-i18n="required">This field is required</span>',
        'Error loading users': '<span data-i18n="itemLoadError">Error loading data</span>'
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
