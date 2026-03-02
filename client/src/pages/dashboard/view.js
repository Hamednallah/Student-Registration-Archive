/**
 * Dashboard view module - contains functions to render the dashboard UI
 */
import { state } from './index.js';

/**
 * Check if current user is admin
 * @returns {boolean} True if user is admin
 */
function isUserAdmin() {
    return state.currentUser?.role === 'A';
}

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
export async function getContent() {
    // Make sure to get fresh data for current user
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            state.currentUser = JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    
    // Check if user is admin
    const isAdmin = isUserAdmin();
    
    return `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <h1 data-i18n="dashboardTitle">Dashboard</h1>
                <p class="welcome-message">
                    <span data-i18n="welcomeMessage">Welcome</span>, <span id="dashboardUsername">${state.currentUser?.username || 'User'}</span>!
                </p>
            </div>

            <div class="dashboard-actions">
                <h2 data-i18n="quickActions">Quick Actions</h2>
                <div class="action-buttons">
                    <button id="addReceiptBtn" class="btn-primary">
                        <i class="fas fa-plus-circle"></i>
                        <span data-i18n="addReceipt">Add Receipt</span>
                    </button>
                    
                    <button id="addStudentBtn" class="btn-primary">
                        <i class="fas fa-user-plus"></i>
                        <span data-i18n="addStudent">Add Student</span>
                    </button>
                    
                    <button id="addDepartmentBtn" class="btn-primary">
                        <i class="fas fa-building"></i>
                        <span data-i18n="addDepartment">Add Department</span>
                    </button>
                    
                    <button id="addUserBtn" class="btn-primary" ${!isAdmin ? 'style="display:none"' : ''}>
                        <i class="fas fa-user-plus"></i>
                        <span data-i18n="addUser">Add User</span>
                    </button>
                </div>
            </div>
            
            <div class="dashboard-stats">
                <div class="stat-card" id="studentStatsCard">
                    <div class="stat-icon">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="stat-content">
                        <h3 data-i18n="totalStudents">Total Students</h3>
                        <div class="stat-value" id="totalStudentsValue">--</div>
                    </div>
                </div>
                
                <div class="stat-card" id="receiptsStatsCard">
                    <div class="stat-icon">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-content">
                        <h3 data-i18n="totalReceipts">Total Receipts</h3>
                        <div class="stat-value" id="totalReceiptsValue">--</div>
                    </div>
                </div>
                
                <div class="stat-card" id="departmentsStatsCard">
                    <div class="stat-icon">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="stat-content">
                        <h3 data-i18n="totalDepartments">Total Departments</h3>
                        <div class="stat-value" id="totalDepartmentsValue">--</div>
                    </div>
                </div>
                
                <div class="stat-card" id="amountStatsCard">
                    <div class="stat-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-content">
                        <h3 data-i18n="totalAmount">Total Amount</h3>
                        <div class="stat-value" id="totalAmountValue">--</div>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-widgets">
                <div class="widget" id="recentReceipts">
                    <h2 data-i18n="recentReceipts">Recent Receipts</h2>
                    <div class="widget-content" id="recentReceiptsContainer">
                        <p class="loading-message" data-i18n="loading">Loading...</p>
                    </div>
                </div>
                
                <div class="widget" id="studentStats">
                    <h2 data-i18n="studentStatistics">Student Statistics</h2>
                    <div class="widget-content" id="studentStatsContainer">
                        <p class="loading-message" data-i18n="loading">Loading...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
} 