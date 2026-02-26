/**
 * Index page module
 */
import { apiService } from '../services/apiService.js';


let isAuthenticated = false;
// Page configuration
const config = {
    title: 'Welcome',
    isPublic: true
};

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
async function getContent() {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    if (token) {
        isAuthenticated = true;
    }
    return `
        <!-- Hero Section with Transparent Login Card -->
        <section id="hero">
            <div class="hero-content">
                <h1 data-i18n="heroHeading">Welcome to the Student Registration Archive</h1>
                <p data-i18n="heroSubheading">Manage and archive students registration information with ease</p>
                ` + (isAuthenticated ? `
                <div class="features-grid">
                    <div class="feature-card">
                    <h3 data-i18n="heroInfoHeading">This system allows you to manage student registration receipts, student data, and department information.</h3>
                    <p data-i18n="heroInfoContent">Port Sudan National University is the oldest University in eastern Sudan, as it was established in 1995 in the city of Port Sudan.</p>
                    <p data-i18n="aboutContent">Information about Port Sudan Ahlia University...</p>
                    <input class="btn-primary" type="button" value="Dashboard" onclick="window.location.href='?page=dashboard';" data-i18n="dashboard">
                    </div>
                </div>
                ` : `
                <div class="login-card">
                    <p data-i18n="loginHeading">Please log in to access the system</p>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="username" data-i18n="usernameLabel">Username</label>
                            <input type="text" id="username" name="username" 
                                data-i18n="usernamePlaceholder" data-i18n-attr="placeholder" 
                                minlength="3" maxlength="200" autocomplete="username" required>
                            <small class="help-text" data-i18n="usernameHelp">Enter your username (3-200 characters)</small>
                        </div>
                        <div class="form-group">
                            <label for="password" data-i18n="passwordLabel">Password</label>
                            <input type="password" id="password" name="password" 
                                data-i18n="passwordPlaceholder" data-i18n-attr="placeholder" 
                                minlength="8" maxlength="50" autocomplete="current-password" required>
                            <small class="help-text" data-i18n="passwordHelp">Enter your password (at least 8 characters)</small>
                        </div>
                        <div class="form-group error-message" id="errorMessage" style="display: none;"></div>
                        <button type="submit" class="btn-primary" data-i18n="loginButton">Log In</button>
                    </form>
                </div>
                `) + `
            </div>
        </section>

        <!-- Features Section -->
        <section id="features">
            <div class="container">
                <h2 data-i18n="featuresHeading">System Features</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <i class="fa fa-file-text"></i>
                        <h3 data-i18n="receiptsFeature">Receipt Management</h3>
                        <p data-i18n="receiptsDesc">Efficient handling and archiving of student registration receipts.</p>
                    </div>
                    <div class="feature-card">
                        <i class="fa fa-users"></i>
                        <h3 data-i18n="studentsFeature">Student Management</h3>
                        <p data-i18n="studentsDesc">Add, update, and track student registration data.</p>
                    </div>
                    <div class="feature-card">
                        <i class="fa fa-building"></i>
                        <h3 data-i18n="departmentsFeature">Department Management</h3>
                        <p data-i18n="departmentsDesc">Organize and manage University departments and courses.</p>
                    </div>
                    <div class="feature-card">
                        <i class="fa fa-bar-chart"></i>
                        <h3 data-i18n="reportsFeature">Comprehensive Reporting</h3>
                        <p data-i18n="reportsDesc">Detailed reports and statistics on student registration operations.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section id="about">
            <div class="container">
                <h2 data-i18n="aboutHeading">About the University</h2>
                <p data-i18n="aboutContent">Information about Port Sudan Ahlia University...</p>
            </div>
        </section>
    `;
}

/**
 * Initialize page functionality
 */
function init() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, attaching event listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found in the DOM');
    }
}

/**
 * Emergency render method that doesn't rely on the template system
 * Used as a fallback if main system fails
 */
function emergencyRender() {
    document.body.innerHTML = `
        <div style="max-width: 800px; margin: 50px auto; font-family: Arial, sans-serif;">
            <h1>Port Sudan Ahlia University</h1>
            <h2>Student Registration System</h2>
            
            <div style="background: #f5f5f5; border-radius: 10px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h3>Login</h3>
                <form id="emergencyLoginForm">
                    <div style="margin-bottom: 15px;">
                        <label for="username" style="display: block; margin-bottom: 5px;">Username</label>
                        <input type="text" id="username" autocomplete="username" minlength="3" maxlength="200" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; font-size: 12px;">Enter your username (3-200 characters)</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="password" style="display: block; margin-bottom: 5px;">Password</label>
                        <input type="password" id="password" autocomplete="current-password" minlength="8" maxlength="50" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; font-size: 12px;">Enter your password (at least 8 characters)</small>
                    </div>
                    <div id="emergencyError" style="color: red; margin-bottom: 15px; display: none;"></div>
                    <button type="submit" style="background: #5A2D8A; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Login</button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('emergencyLoginForm').addEventListener('submit', handleLogin);
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const errorMessage = document.getElementById('errorMessage') || document.getElementById('emergencyError');
    const username = String(form.querySelector('#username').value).trim();
    const password = String(form.querySelector('#password').value).trim();
    
    console.log('Login attempt for username:', username);
    
    // Clear previous error messages
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    
    try {
        console.log('Calling apiService.login...');
        
        const response = await apiService.login(username, password);
        console.log('Login response:', response);
        
        // The apiService.login function already stores the token and user data
        // in localStorage when the response is successful.
        // Just verify that we have a token in localStorage now
        if (localStorage.getItem('token')) {
            // Redirect to dashboard
            console.log('Login successful, redirecting to dashboard...');
            window.location.href = '?page=dashboard';
        } else {
            throw new Error('Authentication failed: No token received');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMessage) {
            if (error.message.includes('credentials')) {
                errorMessage.innerHTML = `<span data-i18n="invalidCredentials">Login failed. Please check your username and password.</span>`;
            } else if (error.message.includes('Username')) {
                errorMessage.innerHTML = `<span data-i18n="invalidUsername">Invalid username. Please enter a valid username.</span>`;
            } else if (error.message.includes('Password')) {
                errorMessage.innerHTML = `<span data-i18n="invalidPassword">Invalid password. Please enter a valid password.</span>`;
            } else {
                errorMessage.innerHTML = `<span data-i18n="loginError">${error.message || 'Login failed. Please try again.'}</span>`;
            }
            errorMessage.style.display = 'block';
        } else {
            alert('Login failed: ' + (error.message || 'Please check your credentials.'));
        }
    }
}

// Export page module
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init,
    emergencyRender
}; 