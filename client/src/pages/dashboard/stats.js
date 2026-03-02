/**
 * Dashboard statistics module
 */
import { apiService } from '../../services/apiService.js';
import { addCommas } from '../../utils/convertToWords.js';
import { applyTranslations } from '../../utils/components/components.js';
import { showError } from './ui.js';
import { state } from './index.js';

// Initialize charts (for backward compatibility)
// export let studentsChart = null;
// export let departmentsChart = null;

/**
 * Load dashboard data
 */
export async function loadDashboardData() {
    try {
        // Fetch data for dashboard widgets
        await Promise.all([
            loadReceiptsStats(),
            loadStudentStats(),
            loadDepartmentStats()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

/**
 * Load recent receipts
 */
export async function loadReceiptsStats() {
    try {
        const allRes = await apiService.get('/receipts/amounts');
        document.getElementById('totalReceiptsValue').innerText = allRes.data.COUNT;
        document.getElementById('totalAmountValue').innerText = addCommas(allRes.data.AMOUNT || 0);
        const recentRes = await apiService.get('/receipts/recent');
        const receiptsData = Array.isArray(recentRes.data) ? recentRes.data : [];
        displayRecentReceipts(receiptsData);
    } catch (error) {
        console.error('Error loading recent receipts:', error);
        document.getElementById('recentReceiptsContainer').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span data-i18n="dataLoadError">Failed to load data</span>
            </div>
        `;
    }
}

/**
 * Load student statistics
 */
export async function loadStudentStats() {
    try {
        const response = await apiService.get('/students/stats');
        displayStudentStats(response.data || {});
    } catch (error) {
        console.error('Error loading student stats:', error);
        document.getElementById('studentStatsContainer').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span data-i18n="dataLoadError">Failed to load data</span>
            </div>
        `;
    }
}

/**
 * Load and display department statistics
 */
export async function loadDepartmentStats() {
    try {
        const response = await apiService.get('/department/stats');
        const stats = response.data || {};
        document.getElementById('totalDepartmentsValue').innerText = stats.total || 0;
        
    } catch (error) {
        console.error('Error loading department stats:', error);
        document.getElementById('departmentsStatsCard').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span data-i18n="dataLoadError">Failed to load data</span>
            </div>
        `;
    }
}

/**
 * Display recent receipts in the dashboard
 * @param {Array} receipts - Recent receipts data
 */
function displayRecentReceipts(receipts) {
    const container = document.getElementById('recentReceiptsContainer');
    
    // Ensure receipts is an array
    if (!Array.isArray(receipts) || receipts.length === 0) {
        container.innerHTML = `<p class="no-data" data-i18n="noReceipts">No recent receipts</p>`;
        return;
    }
    
    let html = `
        <table class="data-table small">
            <thead>
                <tr>
                    <th data-i18n="receiptIdLabel">ID</th>
                    <th data-i18n="studentName">Student</th>
                    <th data-i18n="amount">Amount</th>
                    <th data-i18n="date">Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    receipts.forEach(receipt => {
        html += `
            <tr>
                <td>${receipt.RECEIPT_ID}</td>
                <td>${receipt.STUDENT_NAME || receipt.STUDENT_ID}</td>
                <td>${addCommas(receipt.AMOUNT_NUMBER)}</td>
                <td>${new Date(receipt.ENTRY_DATE).toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

/**
 * Display student statistics
 * @param {Object} stats - Student statistics data
 */
function displayStudentStats(stats) {
    const container = document.getElementById('studentStatsContainer');
    
    if (!stats || Object.keys(stats).length === 0) {
        container.innerHTML = `<p class="no-data" data-i18n="noStudentStats">No student statistics available</p>`;
        applyTranslations(container);
        return;
    }
    
    // Update total students counter
    const totalStudentsElement = document.getElementById('totalStudentsValue');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = stats.total || 0;
    }
    
    // Create pie chart for students by department
    if (stats.byDepartment) {
        const canvasId = 'studentsByDepartmentChart';
        
        container.innerHTML = `
            <div class="chart-container">
                <canvas id="${canvasId}" width="400" height="300"></canvas>
                <div id="studentChartLoading" class="chart-loading-overlay">
                    <div class="spinner"></div>
                    <span data-i18n="loadingChart">Loading chart...</span>
                </div>
            </div>
        `;
        applyTranslations(container);
        
        const loadingElement = document.getElementById('studentChartLoading');
        
        try {
            // Get translated chart labels
            const translations = JSON.parse(localStorage.getItem('translations') || '{}');
            const chartTitle = translations['studentsByDepartment'] || 'Students by Department';
            
            const ctx = document.getElementById(canvasId).getContext('2d');
            
            // Destroy existing chart if it exists
            if (state.studentsChart) {
                state.studentsChart.destroy();
            }
            
            // Create labels and data from the stats
            const labels = Object.keys(stats.byDepartment);
            const data = Object.values(stats.byDepartment);
            
            // Create the chart
            state.studentsChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                            '#858796', '#5a5c69', '#6f42c1', '#fd7e14', '#20c9a6'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    family: "'Tajawal', sans-serif"
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: chartTitle,
                            font: {
                                family: "'Tajawal', sans-serif"
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.formattedValue;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.raw / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });
            
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error creating student chart:', error);
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="chart-error">
                        <i class="fa fa-exclamation-circle"></i>
                        <span data-i18n="chartError">Error loading chart</span>
                    </div>
                `;
                applyTranslations(loadingElement);
            }
        }
    } else {
        container.innerHTML = `<p class="no-data" data-i18n="noDepartmentData">No department data available</p>`;
        applyTranslations(container);
    }
} 