/**
 * Dashboard initialization module
 */
import { applyTranslations } from '../../utils/components/components.js';
import { checkAuth, displayUserInfo, setupRoleBasedAccess, setupLogout } from './auth.js';
import { setupDashboardButtons } from './ui.js';
import { loadDashboardData } from './stats.js';
import { state } from './index.js';

/**
 * Initialize page functionality
 */
export async function init() {
    console.log("Initializing dashboard...");
    
    // Load user data from localStorage first to ensure it's available
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            state.currentUser = JSON.parse(userData);
            console.log("User data loaded from localStorage:", state.currentUser?.username, "Role:", state.currentUser?.role);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    
    // Check authentication next
    if (!checkAuth()) {
        console.log("Authentication check failed, redirecting...");
        return;
    }
    
    console.log("Authentication successful, setting up dashboard for user:", state.currentUser?.username);
    
    // Apply translations to the page
    applyTranslations();
    
    // Display user info
    displayUserInfo();
    
    // Set up role-based access
    setupRoleBasedAccess();
    
    // Set up logout button
    setupLogout();
    
    // Ensure UI elements are properly setup based on role
    // We call this again to ensure buttons are properly configured
    setupDashboardButtons();
    
    // Load dashboard data
    await loadDashboardData();
} 