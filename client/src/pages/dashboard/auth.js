/**
 * Dashboard authentication module
 */
import { apiService } from '../../services/apiService.js';
import { state } from './index.js';

/**
 * Check token expiration
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000;
        return Date.now() >= expiration;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
    }
}

/**
 * Check authentication and redirect if not logged in
 * @returns {boolean} True if authenticated
 */
export function checkAuth() {
    // Get token and user data from localStorage
    const tokenValue = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    // Update state token
    state.token = tokenValue;
    
    if (!tokenValue || isTokenExpired(tokenValue)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = './index.html';
        return false;
    }
    
    try {
        if (userData) {
            // Set currentUser in state
            state.currentUser = JSON.parse(userData);
        }
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        window.location.href = './index.html';
        return false;
    }
}

/**
 * Set up token expiration check at regular intervals
 */
export function setupTokenExpirationCheck() {
    const checkInterval = 60000; // Check every minute
    setInterval(() => {
        const token = localStorage.getItem('token');
        if (token && isTokenExpired(token)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = './index.html';
        }
    }, checkInterval);
}

/**
 * Display user information in the header
 */
export function displayUserInfo() {
    if (!state.currentUser) return;
    
    const usernameElement = document.getElementById('user-name');
    const roleElement = document.getElementById('user-role');
    
    if (usernameElement) {
        usernameElement.textContent = state.currentUser.username;
    }
    
    if (roleElement) {
        roleElement.textContent = state.currentUser.role;
        
        // Set role badge color based on role
        if (state.currentUser.role === 'A') {
            roleElement.style.backgroundColor = '#4caf50'; // Green for admin
        } else {
            roleElement.style.backgroundColor = '#2196f3'; // Blue for regular user
        }
    }
}

/**
 * Show/hide elements based on user role
 */
export function setupRoleBasedAccess() {
    if (!state.currentUser) return;
    
    const userRole = state.currentUser.role;
    const isAdmin = userRole === 'A';
    
    console.log("Setting up role-based access, user role:", userRole, "isAdmin:", isAdmin);
    
    // Show elements for all roles
    document.querySelectorAll('[data-role="all"]').forEach(el => {
        el.style.display = '';
    });
    
    // Show elements specific to user's role
    document.querySelectorAll(`[data-role*="${userRole}"]`).forEach(el => {
        el.style.display = '';
    });
    
    // Handle users section specifically for admin
    const usersSection = document.getElementById('users');
    if (usersSection) {
        usersSection.style.display = isAdmin ? '' : 'none';
    }
    
    // Handle admin-only buttons
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.style.display = isAdmin ? '' : 'none';
        console.log("User button visibility set to:", isAdmin ? 'visible' : 'hidden');
    }
}

/**
 * Handle logout
 */
export function setupLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiService.logout();
            localStorage.removeItem('user');
            window.location.href = window.location.origin + window.location.pathname.split('?')[0];
        });
    }
} 