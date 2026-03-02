/**
 * Format paid items for display
 * @param {string} paidItems - Paid items string
 * @returns {string} Formatted paid items
 */
export function formatPaidItems(paidItems) {
    if (!paidItems) return '-';
    
    const items = [];
    if (paidItems.includes('T')) items.push('Tuition');
    if (paidItems.includes('R')) items.push('Registration');
    if (paidItems.includes('F')) items.push('Fines');
    
    return items.join(', ') || '-';
}

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString || '-';
    }
}

/**
 * Format amount for display
 * @param {number} amount - Amount number
 * @returns {string} Formatted amount
 */
export function formatAmount(amount) {
    if (amount === null || amount === undefined) return '-';
    
    try {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } catch (error) {
        console.error('Error formatting amount:', error);
        return amount.toString();
    }
}

/**
 * Validate receipt data
 * @param {Object} data - Receipt data object
 * @returns {Object} Validation result
 */
export function validateReceiptData(data) {
    const errors = {};
    
    // Student ID validation
    if (!data.studentId) {
        errors.studentId = 'Student ID is required';
    }
    
    // Student Name validation (if it's a new student)
    if (data.isNewStudent && !data.studentName) {
        errors.studentName = 'Student name is required for new students';
    }
    
    // Amount validation
    if (!data.amountNumber || isNaN(data.amountNumber) || data.amountNumber <= 0) {
        errors.amountNumber = 'A valid amount greater than zero is required';
    }
    
    // Amount in words validation
    if (!data.amountLetters) {
        errors.amountLetters = 'Amount in words is required';
    }
    
    // Payment categories validation
    if (!data.paidItems || data.paidItems.length === 0) {
        errors.paidItems = 'At least one payment category must be selected';
    }
    
    // Department validation
    if (!data.departmentId) {
        errors.departmentId = 'Department is required';
    }
    
    // Semester validation
    if (!data.semesterNo || isNaN(data.semesterNo) || data.semesterNo < 1) {
        errors.semesterNo = 'A valid semester number is required';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Create a receipt object from form data
 * @param {FormData} formData - Form data
 * @returns {Object} Receipt data object
 */
export function createReceiptFromForm(form) {
    const formData = new FormData(form);
    
    return {
        studentId: formData.get('studentId'),
        studentName: formData.get('studentName'),
        amountNumber: parseFloat(formData.get('amountNumber')),
        amountLetters: formData.get('amountLetters'),
        bankReceiptNo: formData.get('bankReceiptNo') || null,
        paidItems: Array.from(form.querySelectorAll('input[name="paidItems"]:checked'))
            .map(checkbox => checkbox.value)
            .join(''),
        departmentId: formData.get('departmentId'),
        semesterNo: parseInt(formData.get('semesterNo')),
        comments: formData.get('comments') || null
    };
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
} 