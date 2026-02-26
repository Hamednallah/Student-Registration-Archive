/**
 * Dashboard module - Entry point
 */
import { getContent } from './view.js';

// Page configuration
export const config = {
    title: 'Dashboard',
    isPublic: false
};

// Export mutable state object for user information
export const state = {
    currentUser: null,
    token: null,
    studentsChart: null,
    departmentsChart: null
};

/**
 * Initialize the dashboard
 */
export async function init() {
    const { init: initDashboard } = await import('./init.js');
    return initDashboard();
}

// Export default for dynamic imports
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init
}; 