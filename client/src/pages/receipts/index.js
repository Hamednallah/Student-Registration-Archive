import '../dashboard.js'; // Import dashboard.js for auth and header functionality
import { getReceiptForm } from './form.js';
import { getReceiptsList } from './list.js';
import { init } from './handlers.js';

/**
 * Receipts page module
 */
export const config = {
    title: 'Receipts',
    isPublic: false
};

export let currentPage = 1;
export let isView = false;

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
export async function getContent() {
    const action = new URLSearchParams(window.location.search).get('action');
    
    if (action === 'new' || action === 'add') {
        return getReceiptForm();
    }
    
    if (action === 'edit') {
        const receiptId = new URLSearchParams(window.location.search).get('id');
        return getReceiptForm(receiptId);
    }
    if (action == 'view'){
        isView = true;
        const receiptId = new URLSearchParams(window.location.search).get('id');
        return getReceiptForm(receiptId);
    }
    
    return getReceiptsList();
}

// Export default for dynamic imports
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init
}; 