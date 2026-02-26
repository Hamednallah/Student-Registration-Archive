import { apiService } from '../../services/apiService.js';
import { initNewReceipt, initEditReceipt, initViewReceipt } from './form.js';
import { initReceiptsList } from './list.js';

/**
 * Initialize page functionality
 */
export async function init() {
    const action = new URLSearchParams(window.location.search).get('action');
    // Make deleteReceipt available globally
    window.deleteReceipt = deleteReceipt;
    
    /**
     * View receipt details in readonly mode
     * @param {string} receiptId - Receipt ID to view
     */
    window.viewReceipt = function(receiptId) {
        window.location.href = `?page=receipts&action=view&id=${receiptId}`;
    };
    
    /**
     * Print receipt
     * @param {string} receiptId - Receipt ID to print
     */
    window.printReceipt = function(receiptId) {
        window.open(`?page=receipts&action=print&id=${receiptId}`, '_blank');
    };
    
    if (action === 'view') {
        const receiptId = new URLSearchParams(window.location.search).get('id');
        await initViewReceipt(receiptId);
    } else if (action === 'new' || action === 'add') {
        await initNewReceipt();
    } else if (action === 'edit') {
        const receiptId = new URLSearchParams(window.location.search).get('id');
        await initEditReceipt(receiptId);
    } else if (action === 'print') {
        const receiptId = new URLSearchParams(window.location.search).get('id');
        printReceiptTemplate(receiptId);
    } else {
        await initReceiptsList();
    }
}

/**
 * Handle new receipt form submission
 * @param {Event} e - Form submit event
 */
export async function handleNewReceipt(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span  class="spinner"></span> Saving...';
    }
    
    try {
        // Get form data
        const formData = new FormData(form);
        
        // Create receipt data object
        const receiptData = {
            student_id: formData.get('studentId'),
            student_name: formData.get('studentName'),
            amount_number: parseFloat(formData.get('amountNumber')),
            amount_letters: formData.get('amountLetters'),
            bank_receipt_no: formData.get('bankReceiptNo') || null,
            paid_items: Array.from(form.querySelectorAll('input[name="paidItems"]:checked'))
                .map(checkbox => checkbox.value)
                .join(''),
            department_id: formData.get('departmentId'),
            semester_no: parseInt(formData.get('semesterNo')),
            comments: formData.get('comments') || null
        };
        // Send data to API
        const response = await apiService.post('/receipt', receiptData);
        
        if (response.success) {
            showSuccess('Receipt created successfully');
            
            // Redirect to receipts list after successful creation
            setTimeout(() => {
                window.location.href = '?page=receipts';
            }, 1500);
        } else {
            throw new Error('Failed to create receipt');
        }
    } catch (error) {
        console.error('Error creating receipt:', error);
        showError(error.message || 'Failed to create receipt');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';
        }
    }
}

/**
 * Handle edit receipt form submission
 * @param {Event} e - Form submit event
 * @param {string} receiptId - Receipt ID being edited
 */
export async function handleEditReceipt(e, receiptId) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }
    
    try {
        // Get form data
        const formData = new FormData(form);
        
        // Create receipt data object
        const receiptData = {
            amount_number: parseFloat(formData.get('amountNumber'))
        };
        
        // Send data to API
        const response = await apiService.put(`/receipts/${receiptId}`, receiptData);
        console.log(response);
        if (response.status === 201) {
            showSuccess('Receipt updated successfully');
            
            // Redirect to receipts list after successful update
            setTimeout(() => {
                window.location.href = '?page=receipts';
            }, 1500);
        } else {
            throw new Error('Failed to update receipt');
        }
    } catch (error) {
        console.error('Error updating receipt:', error);
        showError(error.message || 'Failed to update receipt');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    }
}

/**
 * Delete receipt
 * @param {string} receiptId - Receipt ID to delete
 */
export async function deleteReceipt(receiptId) {
    if (!confirm('Are you sure you want to delete this receipt?')) {
        return;
    }
    
    try {
        const response = await apiService.delete(`/receipts/${receiptId}`);
        if (response.success) {
            showSuccess('Receipt deleted successfully');
            
            // Reload receipts list
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error('Failed to delete receipt');
        }
    } catch (error) {
        console.error('Error deleting receipt:', error);
        showError(error.message || 'Failed to delete receipt');
    }
}

/**
 * Print receipt template
 * @param {string} receiptId - Receipt ID to print
 */
export async function printReceiptTemplate(receiptId) {
    try {
        // Import required utilities
        const { addCommas } = await import('../../utils/convertToWords.js');
        
        // Get receipt data
        const response = await apiService.get(`/receipts/${receiptId}`);
        const receipt = response.data;
        
        if (!receipt) {
            throw new Error('Receipt data not found');
        }
        
        // Create print window
        const printWindow = window.open('', '_blank');
        
        // Check if window was successfully created
        if (!printWindow) {
            throw new Error('Print window could not be created. Please check if pop-ups are blocked by your browser.');
        }
        
        // Get current language
        const isArabic = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
        
        // Format amount with commas
        const formattedAmount = addCommas(receipt.AMOUNT_NUMBER || 0);
        
        // Format date
        let formattedDate = '-';
        try {
            if (receipt.ENTRY_DATE) {
                const date = new Date(receipt.ENTRY_DATE);
                if (!isNaN(date.getTime())) {
                    // Use ar-EG instead of ar-SA to avoid Hijri calendar
                    formattedDate = date.toLocaleDateString(isArabic ? 'ar-EG' : undefined);
                }
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }
        
        // Prepare translations
        const translations = {
            title: isArabic ? 'إيصال' : 'Receipt',
            universityName: isArabic ? 'جامعة بورتسودان الأهلية' : 'Port Sudan Ahlia College',
            receiptNumber: isArabic ? 'رقم الإيصال' : 'Receipt No',
            studentId: isArabic ? 'رقم الطالب' : 'Student ID',
            studentName: isArabic ? 'اسم الطالب' : 'Student Name',
            amount: isArabic ? 'مبلغ الدفع' : 'Amount',
            amountWords: isArabic ? 'المبلغ بالحروف' : 'Amount in Words',
            paymentCategories: isArabic ? 'فئات الدفع' : 'Payment Categories',
            bankReceiptNo: isArabic ? 'رقم مرجع الإيصال البنكي' : 'Bank Receipt Reference',
            department: isArabic ? 'القسم الأكاديمي' : 'Academic Department',
            semester: isArabic ? 'الفصل الدراسي الحالي' : 'Current Semester',
            comments: isArabic ? 'ملاحظات إضافية' : 'Additional Notes',
            date: isArabic ? 'التاريخ' : 'Date',
            signature: isArabic ? 'التوقيع المعتمد' : 'Authorized Signature',
            tuition: isArabic ? 'رسوم دراسية' : 'Tuition Fees',
            registration: isArabic ? 'رسوم التسجيل' : 'Registration Fees',
            fines: isArabic ? 'غرامات التأخير' : 'Late Payment Fines'
        };
        
        // Format paid items with translations
        function formatPaidItemsTranslated(paidItems) {
            if (!paidItems) return '-';
            
            const items = [];
            if (paidItems.includes('T')) items.push(translations.tuition);
            if (paidItems.includes('R')) items.push(translations.registration);
            if (paidItems.includes('F')) items.push(translations.fines);
            
            return items.join(', ') || '-';
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>${translations.title} #${receipt.RECEIPT_ID || ''}</title>
                <style>
                    body {
                        font-family: ${isArabic ? '"Tajawal", "Arial", sans-serif' : '"Arial", sans-serif'};
                        margin: 0;
                        padding: 0;
                        direction: ${isArabic ? 'rtl' : 'ltr'};
                        text-align: ${isArabic ? 'right' : 'left'};
                    }
                    .receipt {
                        max-width: 800px;
                        margin: 20px auto;
                        padding: 20px;
                        border: 1px solid #ccc;
                    }
                    .receipt-header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .receipt-body {
                        margin-bottom: 20px;
                    }
                    .receipt-footer {
                        margin-top: 50px;
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    tr {
                        border-bottom: 1px solid #eee;
                    }
                    td {
                        padding: 8px;
                    }
                    .label {
                        font-weight: bold;
                        width: 40%;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .receipt {
                            border: none;
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="receipt-header">
                        <h1>${translations.universityName}</h1>
                        <h2>${translations.receiptNumber}: ${receipt.RECEIPT_ID || ''}</h2>
                    </div>
                    <div class="receipt-body">
                        <table>
                            <tr>
                                <td class="label">${translations.studentId}:</td>
                                <td>${receipt.STUDENT_ID || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.studentName}:</td>
                                <td>${receipt.STUDENT_NAME || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.bankReceiptNo}:</td>
                                <td>${receipt.BANK_RECEIPT_NO || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.amount}:</td>
                                <td>${formattedAmount}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.amountWords}:</td>
                                <td>${receipt.AMOUNT_LETTERS || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.paymentCategories}:</td>
                                <td>${formatPaidItemsTranslated(receipt.PAID_ITEMS)}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.department}:</td>
                                <td>${receipt.DEPARTMENT_NAME || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.semester}:</td>
                                <td>${receipt.SEMESTER_NO || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.comments}:</td>
                                <td>${receipt.COMMENTS || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${translations.date}:</td>
                                <td>${formattedDate}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="receipt-footer">
                        <p>${translations.signature}: _______________________</p>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        console.error('Error printing receipt:', error);
        showError(error.message || 'Failed to print receipt');
    }
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
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
 * @param {string} message - Error message
 */
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.querySelector('main').prepend(errorElement);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
} 