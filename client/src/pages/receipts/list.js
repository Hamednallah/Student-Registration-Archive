import { apiService } from '../../services/apiService.js';
import { addCommas } from '../../utils/convertToWords.js';

/**
 * Get the receipts list HTML
 * @returns {string} List HTML
 */
export function getReceiptsList() {
    return `
        <style>
            .search-box {
                position: relative;
                width: 100%;
            }
            .clear-search {
                position: absolute;
                margin: 0 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
            }
            .reset-date {
                margin-left: 8px;
                padding: 3px 8px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            .reset-date:hover {
                background: #eee;
            }
            .search-loading {
                padding: 10px;
                text-align: center;
                color: #666;
            }
            .spinner.small {
                width: 12px;
                height: 12px;
                border-width: 2px;
                margin-right: 5px;
                display: inline-block;
                vertical-align: middle;
            }
            #exportReceipts {
                margin-left: 10px;
            }
            .float-right {
                float: right;
            }
        </style>
        <div class="container" style="margin-top: 20px;">
            <div class="page-header">
                <h1 data-i18n="receiptsTitle">Receipt Management</h1>
                <button class="btn-primary" onclick="window.location.href='?page=receipts&action=new'">
                    <i class="fa fa-plus"></i>
                    <span data-i18n="addReceipt">Add New Receipt</span>
                </button>
                <button id="exportReceipts" class="btn btn-secondary float-right" data-i18n="exportToCSV">Export to CSV</button>
            </div>
            
            <div class="controls">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Search receipts..." data-i18n="search" data-i18n-attr="placeholder">
                </div>
                
                <div class="filter-group">
                    <label for="dateFilter" data-i18n="dateFilterLabel">Date</label>
                    <input type="date" id="dateFilter">
                </div>
            </div>
            
            <div class="table-container">
                <table id="receiptsTable">
                    <thead>
                        <tr>
                            <th data-i18n="id">ID</th>
                            <th data-i18n="studentIdLabel">Student ID</th>
                            <th data-i18n="bankReceiptNoLabel">Receipt No</th>
                            <th data-i18n="amount">Amount</th>
                            <th data-i18n="paidItemsLabel">Items</th>
                            <th data-i18n="date">Date</th>
                            <th data-i18n="actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="loading">
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
 * Initialize the receipts list
 */
export async function initReceiptsList() {
    // Setup search and filters
    const searchInput = document.getElementById('searchInput');
    const dateFilter = document.getElementById('dateFilter');
    const exportBtn = document.getElementById('exportReceipts');
    
    // Initialize state
    let currentSearchTerm = '';
    let currentDateFilter = '';
    let currentPage = 1;
    
    // Load initial data
    await loadReceipts();
    
    // Add clear button to search input
    const searchBox = document.querySelector('.search-box');
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-search';
    clearButton.innerHTML = '&times;';
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        loadReceipts();
    });
    searchBox.appendChild(clearButton);
    
    // Add reset button to date filter
    const filterGroup = document.querySelector('.filter-group');
    const resetButton = document.createElement('button');
    resetButton.className = 'reset-date';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => {
        dateFilter.value = '';
        currentDateFilter = '';
        loadReceipts();
    });
    filterGroup.appendChild(resetButton);
    
    // Setup event listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentSearchTerm = searchInput.value.trim();
            loadReceipts();
        }, 300));
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            currentDateFilter = dateFilter.value;
            loadReceipts();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReceipts);
    }
    
    /**
     * Load receipts with current filters
     */
    async function loadReceipts(page = 1) {
        page = Number(page) || 1;
        try {
            const tableBody = document.querySelector('#receiptsTable tbody');
            if (!tableBody) return;
            
            // Show loading state
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading">
                        <span class="spinner"></span>
                        <span data-i18n="loading">Loading receipts...</span>
                    </td>
                </tr>
            `;
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page);
            
            if (currentSearchTerm) {
                params.append('q', currentSearchTerm);
            }
            
            if (currentDateFilter) {
                params.append('date', currentDateFilter.split('T')[0]); // Ensure YYYY-MM-DD format
            }
            
            // Fetch receipts
            const response = await apiService.get(`/receipts?${params.toString()}`);
            const { data, pagination } = response.data;
        
            // Update current page with validated value
            currentPage = Number(pagination?.currentPage) || page;
            
            // Render receipts table
            if (data && data.length > 0) {
                tableBody.innerHTML = '';
                
                data.forEach(receipt => {
                    const formattedAmount = addCommas(receipt.AMOUNT_NUMBER);
                    let formattedDate = '-';
                    try {
                        if (receipt.ENTRY_DATE) {
                            const date = new Date(receipt.ENTRY_DATE);
                            if (!isNaN(date.getTime())) {
                                formattedDate = date.toLocaleDateString();
                            }
                        }
                    } catch (e) {
                        console.error('Error formatting date:', e);
                    }
                    
                    tableBody.innerHTML += `
                        <tr>
                            <td>${receipt.RECEIPT_ID}</td>
                            <td>${receipt.STUDENT_ID}</td>
                            <td>${receipt.BANK_RECEIPT_NO || '-'}</td>
                            <td>${formattedAmount}</td>
                            <td>${formatPaidItems(receipt.PAID_ITEMS)}</td>
                            <td>${formattedDate}</td>
                            <td class="actions">
                                <button class="btn-icon" onclick="viewReceipt('${receipt.RECEIPT_ID}')" title="View Receipt">
                                    <i class="fa fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="printReceipt('${receipt.RECEIPT_ID}')" title="Print Receipt">
                                    <i class="fa fa-print"></i>
                                </button>
                                <button class="btn-icon btn-delete" onclick="deleteReceipt('${receipt.RECEIPT_ID}')" title="Delete Receipt">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                // Render pagination
                renderPagination(pagination);
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-data">
                            <p data-i18n="noReceipts">No receipts found</p>
                        </td>
                    </tr>
                `;
                
                // Clear pagination
                document.getElementById('pagination').innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading receipts:', error);
            const tableBody = document.querySelector('#receiptsTable tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error">
                            <p>Failed to load receipts: ${error.message}</p>
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    /**
     * Format paid items for display
     * @param {string} paidItems - Paid items string
     * @returns {string} Formatted paid items
     */
    function formatPaidItems(paidItems) {
        if (!paidItems) return '-';
        
        const items = [];
        if (paidItems.includes('T')) items.push('Tuition');
        if (paidItems.includes('R')) items.push('Registration');
        if (paidItems.includes('F')) items.push('Fines');
        
        return items.join(', ') || '-';
    }
    
    /**
     * Render pagination controls
     * @param {Object} pagination - Pagination data
     */
    function renderPagination(pagination) {
        if (!pagination) return;
        
        const currentPage = Number(pagination?.currentPage) || 1;
        const totalPages = Number(pagination?.totalPages) || 1;
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        let paginationHtml = '';
        // Previous button
        paginationHtml += `
            <button class="pagination-btn prev ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : `onclick="loadReceiptsPage(${currentPage - 1})"`}>
                &laquo; 
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <button class="pagination-btn page ${i === currentPage ? 'active' : ''}" 
                    onclick="loadReceiptsPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        paginationHtml += `
            <button class="pagination-btn next ${currentPage === totalPages ? 'disabled' : ''}" 
                ${currentPage === totalPages ? 'disabled' : `onclick="loadReceiptsPage(${currentPage + 1})"`}>
                 &raquo;
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHtml;
        
        // Make the loadReceiptsPage function available globally
        window.loadReceiptsPage = (page) => loadReceipts(page);
    }
    
    /**
     * Export receipts to CSV
     */
    async function exportReceipts() {
        try {
            const exportBtn = document.getElementById('exportReceipts');
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<span class="spinner small"></span> Exporting...';
            }
            
            const params = new URLSearchParams();
            if (currentSearchTerm) {
                params.append('search', currentSearchTerm);
            }
            if (currentDateFilter) {
                params.append('date', currentDateFilter);
            }
            
            const response = await apiService.get(`/receipts/export?${params.toString()}`);
            const csvContent = response.data;
            
            // Create a download link and trigger the download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = 'Export to CSV';
            }
        } catch (error) {
            console.error('Error exporting receipts:', error);
            
            const exportBtn = document.getElementById('exportReceipts');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = 'Export to CSV';
            }
            
            // Show error message
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = `Failed to export receipts: ${error.message}`;
            document.querySelector('main').prepend(errorElement);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.remove();
            }, 5000);
        }
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