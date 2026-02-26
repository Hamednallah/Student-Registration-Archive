import { apiService } from '../../services/apiService.js';
import { convertToWords } from '../../utils/convertToWords.js';
import { isView } from './index.js';
import { handleNewReceipt } from './handlers.js';

/**
 * Get the receipt form HTML 
 * @param {string} [receiptId] - Receipt ID to edit (optional)
 * @returns {Promise<string>} Form HTML
 */
export async function getReceiptForm(receiptId) {
    try {
      let receiptData = {};
      let isEdit = !!receiptId;
  
      if (isEdit || isView) {
        const receipt = await apiService.get(`/receipts/${receiptId}`);
        receiptData = receipt.data;
      }
  
      const formHtml = `
        <div class="container form-container">
          <h1 data-i18n="${isView ? 'viewReceiptHeading' : (isEdit ? 'editReceiptHeading' : 'newReceiptHeading')}">${isView ? 'View Receipt' : (isEdit ? 'Edit Receipt' : 'New Receipt')}</h1>
          <form id="${isView ? 'viewReceiptForm' : (isEdit ? 'editReceiptForm' : 'newReceiptForm')}" class="form">
            ${isEdit || isView ? `
              <div class="form-group">
                <label for="receiptId" data-i18n="receiptIdLabel">Receipt ID</label>
                <input type="text" id="receiptId" name="receiptId" value="${receiptData.RECEIPT_ID || ''}" readonly class="form-control">
              </div>
            ` : ''}
            <div class="form-group">
              <label for="studentId" data-i18n="studentIdLabel">Student ID</label>
              ${isEdit || isView ? `
                <input type="text" id="studentId" name="studentId" value="${receiptData.STUDENT_ID || ''}" ${isView ? 'readonly' : 'required'} class="form-control">
                ${isView ? `
                <small class="form-text">Student: ${receiptData.STUDENT_NAME || ''}</small>
                ` : ''}
              ` : `
                <div class="searchable-input">
                  <input type="text" id="studentId" name="studentId" class="form-control" required autocomplete="off" placeholder="Search or enter student ID" data-i18n="studentIdPlaceholder">
                  <div class="search-results" id="studentSearchResults"></div>
                </div>
                <small id="studentIdHelp" class="form-text" data-i18n="studentIdHelp">Search for existing student or enter new ID</small>
              `}
            </div>
            ${!isEdit && !isView ? `
              <div class="form-group">
                <label for="studentName" data-i18n="studentName">Student Name</label>
                <input type="text" id="studentName" name="studentName" class="form-control" required placeholder="Enter student's full name" data-i18n="studentNamePlaceholder">
                <small class="form-text" data-i18n="studentNameHelp">Enter the student's full name</small>
              </div>
            ` : ''}
            <div class="form-group">
              <label for="bankReceiptNo" data-i18n="bankReceiptNoLabel">Bank Receipt Reference</label>
              <input type="text" id="bankReceiptNo" name="bankReceiptNo" value="${receiptData.BANK_RECEIPT_NO || ''}" ${isView ? 'readonly' : ''} class="form-control" aria-describedby="bankReceiptNoHelp">
              <small id="bankReceiptNoHelp" class="form-text" data-i18n="bankReceiptNoHelp">Reference number from the bank receipt (if applicable)</small>
            </div>
            <div class="form-group">
              <label for="amountNumber" data-i18n="amountNumberLabel">Payment Amount</label>
              <input type="number" id="amountNumber" name="amountNumber" value="${receiptData.AMOUNT_NUMBER || ''}" step="0.01" min="0${isEdit ? '.01' : ''}" ${isView ? 'readonly' : 'required'} class="form-control" aria-describedby="amountNumberHelp">
              <small id="amountNumberHelp" class="form-text" data-i18n="amountNumberHelp">Enter the payment amount in numbers</small>
            </div>
            <div class="form-group">
              <label for="amountLetters" data-i18n="amountLettersLabel">Amount in Words</label>
              <input type="text" id="amountLetters" name="amountLetters" value="${receiptData.AMOUNT_LETTERS || ''}" ${isView ? 'readonly' : 'required'} class="form-control" aria-describedby="amountLettersHelp">
              <small id="amountLettersHelp" class="form-text" data-i18n="amountLettersHelp">The payment amount written in words</small>
              ${!isView ? `<button type="button" id="convertToWords" class="btn btn-sm btn-secondary mt-1" data-i18n="convertButton">Convert to Words</button>` : ''}
            </div>
            <div class="form-group">
              <label data-i18n="paidItemsLabel">Payment Categories</label>
              <small id="paidItemsHelp" class="form-text d-block" data-i18n="paidItemsHelp">Categories that apply to this payment</small>
              ${isView ? `
                <div class="view-paid-items">
                  ${formatPaidItemsTranslated(receiptData.PAID_ITEMS)}
                </div>
              ` : `
                <div class="checkbox-group">
                  <div class="form-check">
                    <input type="checkbox" id="tuitionFees" name="paidItems" value="T" class="form-check-input">
                    <label for="tuitionFees" class="form-check-label" data-i18n="tuitionFeesLabel">Tuition Fees (T)</label>
                  </div>
                  <div class="form-check">
                    <input type="checkbox" id="registrationFees" name="paidItems" value="R" class="form-check-input">
                    <label for="registrationFees" class="form-check-label" data-i18n="registrationFeesLabel">Registration Fees (R)</label>
                  </div>
                  <div class="form-check">
                    <input type="checkbox" id="fines" name="paidItems" value="F" class="form-check-input">
                    <label for="fines" class="form-check-label" data-i18n="finesLabel">Late Payment Fines (F)</label>
                  </div>
                </div>
              `}
            </div>
            <div class="form-group">
              <label for="departmentId" data-i18n="departmentLabel">Academic Department</label>
              ${isView ? `
                <input type="text" id="departmentName" name="departmentName" value="${receiptData.DEPARTMENT_NAME || ''}" readonly class="form-control">
              ` : `
                <select id="departmentId" name="departmentId" required class="form-control">
                  <option value="" data-i18n="selectDepartmentOption">Select Department</option>
                </select>
              `}
            </div>
            <div class="form-group">
              <label for="semesterNo" data-i18n="semesterNoLabel">Current Semester</label>
              <input type="number" id="semesterNo" name="semesterNo" value="${receiptData.SEMESTER_NO || ''}" min="1" max="99" ${isView ? 'readonly' : 'required'} class="form-control" aria-describedby="semesterNoHelp">
              <small id="semesterNoHelp" class="form-text" data-i18n="semesterNoHelp">Enter a number between 1-99</small>
            </div>
            <div class="form-group">
              <label for="comments" data-i18n="commentsLabel">Additional Notes</label>
              <textarea id="comments" name="comments" ${isView ? 'readonly' : ''} class="form-control" rows="3" aria-describedby="commentsHelp">${receiptData.COMMENTS || ''}</textarea>
              <small id="commentsHelp" class="form-text" data-i18n="commentsHelp">Optional additional information about this payment</small>
            </div>
            ${isView ? `
              <div class="form-group">
                <label data-i18n="dateLabel">Date</label>
                <input type="text" value="${formatDate(receiptData.ENTRY_DATE)}" readonly class="form-control">
              </div>
            ` : ''}
            <div class="form-actions">
              ${!isView ? `<button type="submit" class="btn btn-primary" data-i18n="${isEdit ? 'save' : 'saveButton'}">${isEdit ? 'Save Changes' : 'Save'}</button>` : ''}
              <button type="button" class="btn-secondary" onclick="window.location.href='?page=receipts'" data-i18n="cancel${isEdit ? '' : 'Button'}">Back</button>
              ${isView ? `<button type="button" class="btn-primary" onclick="printReceipt('${receiptData.RECEIPT_ID}')" data-i18n="printButton">Print</button>` : ''}
            </div>
          </form>
        </div>
      `;
  
      return formHtml;
    } catch (error) {
      console.error('Error loading receipt data:', error);
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
 * Format paid items for display with translations
 * @param {string} paidItems - Paid items string
 * @returns {string} Formatted and translated paid items
 */
function formatPaidItemsTranslated(paidItems) {
  if (!paidItems) return '-';
  
  const items = [];
  if (paidItems.includes('T')) items.push('<span data-i18n="tuitionFeesLabel">Tuition Fees</span>');
  if (paidItems.includes('R')) items.push('<span data-i18n="registrationFeesLabel">Registration Fees</span>');
  if (paidItems.includes('F')) items.push('<span data-i18n="finesLabel">Late Payment Fines</span>');
  
  return items.join(', ') || '-';
}

/**
 * Format paid items for display
 * @param {string} paidItems - Paid items string
 * @returns {string} Formatted paid items
 */
function formatPaidItems(paidItems) {
  if (!paidItems) return '-';
  
  const items = [];
  if (paidItems.includes('T')) items.push('Tuition Fees');
  if (paidItems.includes('R')) items.push('Registration Fees');
  if (paidItems.includes('F')) items.push('Late Payment Fines');
  
  return items.join(', ') || '-';
}

/**
 * Format date for display
 * @param {string} dateStr - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
}

/**
 * Initialize the new receipt form
 */
export async function initNewReceipt() {
    // Load departments for the form dropdown
    try {
        const response = await apiService.get('/departments');
        const departments = response.data;
        
        
        const departmentSelect = document.getElementById('departmentId');
        if (departmentSelect) {
            // Clear existing options except the default
            while (departmentSelect.options.length > 1) {
                departmentSelect.remove(1);
            }
            
            // Verify response format and add options
            if (Array.isArray(departments)) {
                departments.forEach(department => {
                    if (department.DEPARTMENT_ID && department.DEPARTMENT_NAME) {
                        const option = document.createElement('option');
                        option.value = department.DEPARTMENT_ID;
                        option.textContent = department.DEPARTMENT_NAME;
                        departmentSelect.appendChild(option);
                    }
                });
                
                if (departments.length === 0) {
                    console.warn('No departments returned from API');
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No departments available';
                    option.disabled = true;
                    departmentSelect.appendChild(option);
                }
            } else {
                console.error('Invalid departments response format:', departments);
                showError('Department data format invalid');
            }
        }
    } catch (error) {
        console.error('Failed to load departments:', error);
        showError('Could not load departments. Please try again later.');
    }
    
    // Handle amount to words conversion
    const amountNumberInput = document.getElementById('amountNumber');
    const convertToWordsBtn = document.getElementById('convertToWords');
    const amountLettersInput = document.getElementById('amountLetters');
    
    if (amountNumberInput && convertToWordsBtn && amountLettersInput) {
        convertToWordsBtn.addEventListener('click', () => {
            try {
                const amountStr = amountNumberInput.value.trim();
                
                if (!amountStr) {
                    showError('Please enter an amount first');
                    return;
                }
                
                const amount = parseFloat(amountStr);
                
                if (isNaN(amount)) {
                    showError('Please enter a valid number');
                    return;
                }
                
                if (amount <= 0) {
                    showError('Amount must be greater than zero');
                    return;
                }
                
                // Handle decimal places
                const decimalPlaces = (amountStr.split('.')[1] || []).length;
                if (decimalPlaces > 2) {
                    showError('Maximum 2 decimal places allowed');
                    return;
                }
                
                amountLettersInput.value = convertToWords(amount);
                
            } catch (error) {
                console.error('Conversion error:', error);
                showError('Failed to convert amount. Please try again.');
            }
        });
    }
    
    
    // Setup student search functionality
    const studentIdInput = document.getElementById('studentId');
    if (studentIdInput) {
        studentIdInput.addEventListener('input', debounce(async function() {
            const query = this.value.trim();
            if (query.length < 1) {
                const resultsContainer = document.getElementById('studentSearchResults');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'none';
                }
                return;
            }
            
            const resultsContainer = document.getElementById('studentSearchResults');
            if (!resultsContainer) return;
            
            // Show loading indicator
            resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
            resultsContainer.style.display = 'block';
            
            try {
                const response = await apiService.get(`/students/search?query=${encodeURIComponent(query)}`);
                const students = Array.isArray(response.data.students) ? response.data.students : 
                                (response.data.students ? [response.data.students] : []);
                
                if (students.length > 0) {
                    resultsContainer.innerHTML = '';
                    students.forEach(student => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        resultItem.textContent = `${student.STUDENT_ID} - ${student.FULL_NAME}`;
                        resultItem.addEventListener('click', () => {
                            document.getElementById('studentId').value = student.STUDENT_ID;
                            if (document.getElementById('studentName')) {
                                document.getElementById('studentName').value = student.FULL_NAME;
                            }
                            // Auto-fill department and semester if fields exist
                            const departmentSelect = document.getElementById('departmentId');
                            if (departmentSelect && student.DEPARTMENT_ID) {
                                departmentSelect.value = student.DEPARTMENT_ID;
                            }
                            const semesterInput = document.getElementById('semesterNo');
                            if (semesterInput && student.SEMESTER_NO) {
                                semesterInput.value = student.SEMESTER_NO;
                            }
                            resultsContainer.innerHTML = '';
                            resultsContainer.style.display = 'none';
                        });
                        resultsContainer.appendChild(resultItem);
                    });
                    resultsContainer.style.display = 'block';
                } else {
                    resultsContainer.innerHTML = '<div class="no-results">No matching students found</div>';
                    resultsContainer.style.display = 'block';
                }
            } catch (error) {
                console.error('Error searching for students:', error);
                resultsContainer.innerHTML = '<div class="error">Error searching for students</div>';
                resultsContainer.style.display = 'block';
            }
        }, 300));
        
        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            const resultsContainer = document.getElementById('studentSearchResults');
            if (resultsContainer && !studentIdInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
            }
        });
    }
    
    // Handle form submission
    const form = document.getElementById('newReceiptForm');
    if (form) {
        form.addEventListener('submit', handleNewReceipt);
    }
}

/**
 * Initialize the view receipt form (readonly)
 * @param {string} receiptId - Receipt ID to view
 */
export async function initViewReceipt(receiptId) {
    try {
        // No need for additional initialization as the form is read-only
        
        // No longer need to add a print button as it's already included in the form HTML
        // Just handle the translation for the paid items
        
        // Manually trigger translation for the paid items which are dynamically added
        if (typeof translateElements === 'function') {
            const paidItemsContainer = document.querySelector('.view-paid-items');
            if (paidItemsContainer) {
                const translateableElements = paidItemsContainer.querySelectorAll('[data-i18n]');
                translateableElements.forEach(el => {
                    translateElements([el]);
                });
            }
        }
    } catch (error) {
        console.error('Error initializing view receipt:', error);
        showError('Failed to load receipt details');
    }
}

/**
 * Initialize the edit receipt form
 * @param {string} receiptId - Receipt ID to edit
 */
export async function initEditReceipt(receiptId) {
    try {
        // Implement receipt editing logic
    } catch (error) {
        console.error('Error initializing edit receipt:', error);
    }
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Show error message
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