/**
 * Dashboard UI module - contains UI related functions
 */
import { state } from './index.js';

/**
 * Setup dashboard buttons and event listeners
 */
export function setupDashboardButtons() {
    // Add Receipt Button
    const addReceiptBtn = document.getElementById('addReceiptBtn');
    if (addReceiptBtn) {
        addReceiptBtn.addEventListener('click', () => {
            window.location.href = '?page=receipts&action=add';
        });
    }
    
    // Add Student Button
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            window.location.href = '?page=students&action=add';
        });
    }
    
    // Add Department Button
    const addDepartmentBtn = document.getElementById('addDepartmentBtn');
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', () => {
            window.location.href = '?page=departments&action=add';
        });
    }
    
    // Add User Button (admin only)
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        // إظهار أو إخفاء زر المستخدمين بناءً على دور المستخدم
        if (state.currentUser && state.currentUser.role === 'A') {
            addUserBtn.style.display = '';
            
            addUserBtn.addEventListener('click', () => {
                window.location.href = '?page=users&action=add';
            });
        } else {
            addUserBtn.style.display = 'none';
        }
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
export function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    document.querySelector('main').prepend(successElement);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        successElement.remove();
    }, 5000);
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
export function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.querySelector('main').prepend(errorElement);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
} 