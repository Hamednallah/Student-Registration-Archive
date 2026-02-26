import apiService from './services/apiService.js';
import { loadComponents, renderTemplateString, applyTranslations as componentApplyTranslations } from './utils/components/components.js';
import { renderPage } from './utils/templateEngine.js';
import { setTranslations } from './utils/components/components.js';
// You can also import the translation checker for debugging
// import { checkTranslations } from './utils/translation-checker.js';

// Global variables
let currentLanguage = localStorage.getItem('language') || 'ar';
let currentTranslations = {};

// Loading state management
const loadingStates = new Map();

function setLoading(element, isLoading) {
    if (isLoading) {
        element.setAttribute('disabled', true);
        element.innerHTML = `<span class="spinner"></span> ${element.dataset.loadingText || 'Loading...'}`;
        loadingStates.set(element, true);
    } else {
        element.removeAttribute('disabled');
        element.innerHTML = element.dataset.originalText;
        loadingStates.delete(element);
    }
}

// Form validation
function validateLoginForm(username, password) {
    
    if (!username || username.length < 3) {
        return 'Username must be at least 3 characters';
    }
    
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    
    return null;
}

// Error handling
function showError(message, element) {
    console.log('Showing error:', message);
    
    // Handle case where element is undefined
    if (!element) {
        console.warn('Element not provided to showError, displaying in body instead');
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message global-error';
        errorElement.textContent = message;
        errorElement.style.position = 'fixed';
        errorElement.style.top = '10px';
        errorElement.style.left = '50%';
        errorElement.style.transform = 'translateX(-50%)';
        errorElement.style.backgroundColor = '#f44336';
        errorElement.style.color = 'white';
        errorElement.style.padding = '10px 20px';
        errorElement.style.borderRadius = '4px';
        errorElement.style.zIndex = '9999';
        document.body.appendChild(errorElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
        return;
    }
    
    // Clear any existing error messages first
    clearErrors(element.closest('form') || document.body);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    element.parentNode.insertBefore(errorElement, element.nextSibling);
}

function clearErrors(container) {
    if (!container) {
        console.warn('Container not provided to clearErrors, using document.body');
        container = document.body;
    }
    
    // Clear both inline error messages and the error message container
    container.querySelectorAll('.error-message').forEach(error => error.remove());
    const errorMessageContainer = container.querySelector('#errorMessage');
    if (errorMessageContainer) {
        errorMessageContainer.style.display = 'none';
        errorMessageContainer.textContent = '';
    }
}

// Initialize the application
async function init() {
    try {
        console.log('Initializing application...');
        
        // Set initial language
        const language = localStorage.getItem('language') || 'ar';
        await setLanguage(language);
        
        // Load page content
        try {
            await loadPageContent();
            
            // Setup event listeners after content is loaded
            console.log('Page content loaded, setting up event listeners');
            setupEventListeners();
        } catch (error) {
            console.error('Failed to load page with template system, using emergency fallback:', error);
            
            // Try to render with emergency method if available
            try {
                // Get current page module
                const pagePath = window.location.pathname;
                let pageName = pagePath.split('/').pop().replace('.html', '');
                
                // Default to index if no page name
                if (!pageName || pageName === '' || pageName === '/' || pageName === 'src') {
                    pageName = 'index';
                }
                
                console.log('Attempting emergency render for page:', pageName);
                
                // Import page module
                const pageModule = await import(`./pages/${pageName}.js`);
                
                // If it has an emergency render method, use it
                if (pageModule.default.emergencyRender) {
                    pageModule.default.emergencyRender();
                    return;
                } else {
                    throw new Error('No emergency render method available');
                }
            } catch (fallbackError) {
                console.error('Emergency fallback also failed:', fallbackError);
                document.body.innerHTML = `
                    <div style="max-width: 600px; margin: 50px auto; padding: 20px; font-family: Arial; text-align: center;">
                        <h1>Application Error</h1>
                        <p>There was a problem loading the application. Please try again later.</p>
                        <div style="margin: 20px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; text-align: left;">
                            <code>${error.message}</code>
                        </div>
                        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #5A2D8A; color: white; border: none; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        // Initialize components
        await import('./utils/components/components.js').then(module => {
            if (module.initializeComponents) {
                module.initializeComponents();
            }
        }).catch(error => {
            console.error('Error loading components module:', error);
        });
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js');
                console.log('Service Worker registered with scope:', registration.scope);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
        
    } catch (error) {
        console.error('Critical error initializing application:', error);
        document.body.innerHTML = `
            <div style="max-width: 600px; margin: 50px auto; padding: 20px; font-family: Arial; text-align: center;">
                <h1>Application Error</h1>
                <p>There was a problem initializing the application. Please try again later.</p>
                <div style="margin: 20px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; text-align: left;">
                    <code>${error.message}</code>
                </div>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #5A2D8A; color: white; border: none; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Set the application language
async function setLanguage(lang) {
  try {
        // Load language file
        const response = await fetch(`./assets/lang/${lang}.json`);
        if (!response.ok) {
            console.warn(`Failed to load language file: ${lang}, falling back to English`);
            // Try to load English as fallback
            if (lang !== 'en') {
                await setLanguage('en');
                return;
            } else {
                // If even English fails, use basic translations
                const fallbackTranslations = {
                    "siteTitle": "Port Sudan Ahlia College",
                    "loginButton": "Login",
                    "usernameLabel": "Username",
                    "passwordLabel": "Password"
                };
                localStorage.setItem('language', 'en');
                localStorage.setItem('translations', JSON.stringify(fallbackTranslations));
                document.documentElement.lang = 'en';
                document.documentElement.dir = 'ltr';
                applyTranslations(document.body);
                return;
            }
        }
    
        const translations = await response.json();
    
        // Store translations
        localStorage.setItem('language', lang);
        localStorage.setItem('translations', JSON.stringify(translations));
    
        // Set HTML attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Apply translations
        applyTranslations(document.body);
    
  } catch (error) {
        console.error('Error setting language:', error);
        // Use fallback if language loading fails
        if (lang !== 'en') {
            console.warn('Falling back to English language');
            try {
                await setLanguage('en');
            } catch (fallbackError) {
                console.error('Fallback language also failed:', fallbackError);
            }
        }
    }
}

// Apply translations to elements
function applyTranslations(element) {
    if (!element) return;
    
    const translations = JSON.parse(localStorage.getItem('translations') || '{}');
    console.log('Current language:', localStorage.getItem('language'));
    
    // First set global translations for components
    setTranslations(translations);
    
    // Use the already imported applyTranslations function
    componentApplyTranslations(element);
}

// Load page content
async function loadPageContent() {
    try {
        // Get current page module
        const pagePath = window.location.pathname;
        console.log('Current path:', pagePath);
        
        // Check URL parameters first for page specification
        const urlParams = new URLSearchParams(window.location.search);
        let pageName = urlParams.get('page');
        
        // If no page in URL params, get from path
        if (!pageName) {
            pageName = pagePath.split('/').pop().replace('.html', '');
        }
        
        // Default to index if no page name or if we're at the root or in /src/
        if (!pageName || pageName === '' || pageName === '/' || pageName === 'src' || pageName === 'index') {
            pageName = 'index';
            console.log('Setting default page to index');
        }
        
        // Fix for when trying to access pages from /src/ path
        if (pageName === 'src' && urlParams.get('page')) {
            pageName = urlParams.get('page');
        }
        
        console.log('Loading page module:', pageName);
        
        // Import page module with better error handling
        try {
            // Log the path we're trying to import for debugging
            const importPath = `./pages/${pageName}.js?v=${Date.now()}`; // Add cache-busting parameter
            console.log('Attempting to import module from path:', importPath);
            
            // Use a direct URL import with a timeout to prevent hanging
            const moduleImportPromise = import(importPath)
                .catch(error => {
                    console.error(`Failed to import module: ${importPath}`, error);
                    // Try alternative import paths as fallback
                    console.log('Trying alternative import paths...');
                    
                    // Try with absolute path
                    return import(`/src/pages/${pageName}.js?v=${Date.now()}`)
                        .catch(err => {
                            console.error('Failed absolute path import, trying with module type:', err);
                            // Add type=module to force correct MIME handling
                            const script = document.createElement('script');
                            script.type = 'module';
                            
                            return new Promise((resolve, reject) => {
                                script.onload = async () => {
                                    try {
                                        // Try to access the module from the global scope
                                        const module = window[`${pageName}Module`];
                                        if (module) {
                                            resolve({ default: module });
                                        } else {
                                            // Last attempt with direct import
                                            try {
                                                const mod = await import(`/pages/${pageName}.js`);
                                                resolve(mod);
                                            } catch (finalError) {
                                                reject(finalError);
                                            }
                                        }
                                    } catch (err) {
                                        reject(err);
                                    }
                                };
                                script.onerror = (e) => reject(e);
                                script.src = `/src/pages/${pageName}.js?v=${Date.now()}`;
                                document.head.appendChild(script);
                            });
                        });
                });
            
            // Set a timeout for the import
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Timeout loading module: ${pageName}`)), 8000); // Increased timeout
            });
            
            // Race the import against the timeout
            const pageModule = await Promise.race([moduleImportPromise, timeoutPromise]);
            
            // Check if pageModule is defined and has a default export
            if (!pageModule || !pageModule.default) {
                throw new Error(`Module ${pageName} does not have a default export`);
            }
            
            // Check authentication
            if (pageName !== 'index' && !pageModule.default.isPublic && !localStorage.getItem('token')) {
                console.log('Not authenticated, redirecting to login page');
                window.location.href = './';
                return;
            }
            
            // Get page content
            const content = await pageModule.default.getContent();
            
            // Render page with base template
            const html = await renderPage(content, {
                title: pageModule.default.title,
                isPublic: pageModule.default.isPublic,
                lang: localStorage.getItem('language') || 'ar',
                dir: localStorage.getItem('language') === 'en' ? 'ltr' : 'rtl',
                isArabic: (localStorage.getItem('language') || 'ar') === 'ar',
                isAdmin: JSON.parse(localStorage.getItem('user') || '{}').role === 'A',
                currentUser: JSON.parse(localStorage.getItem('user') || '{}')
            });
            
            // Update document
            document.documentElement.innerHTML = html;
            
            // Initialize page
            if (pageModule.default.init) {
                await pageModule.default.init();
            }
        } catch (error) {
            console.error(`Error loading page module: ${pageName}`, error);
            
            // Special handling for index page
            if (pageName === 'index') {
                console.log('Attempting direct render for index page');
                // Fall back to a direct login form without any module imports
                document.body.innerHTML = `
                    <div style="max-width: 800px; margin: 50px auto; font-family: Arial, sans-serif;">
                        <h1>Port Sudan Ahlia College</h1>
                        <h2>Student Registration System</h2>
                        
                        <div style="background: #f5f5f5; border-radius: 10px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <h3>Login</h3>
                            <form id="emergencyLoginForm">
                                <div style="margin-bottom: 15px;">
                                    <label for="username" style="display: block; margin-bottom: 5px;">Username</label>
                                    <input type="text" id="username" autocomplete="username" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label for="password" style="display: block; margin-bottom: 5px;">Password</label>
                                    <input type="password" id="password" autocomplete="current-password" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div id="emergencyError" style="color: red; margin-bottom: 15px; display: none;"></div>
                                <button type="submit" style="background: #5A2D8A; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Login</button>
                            </form>
                        </div>
                    </div>
                `;
                
                // Add a simple login handler
                document.getElementById('emergencyLoginForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const username = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    const errorElement = document.getElementById('emergencyError');
                    
                    try {
                        // Use the imported apiService directly
                        const loginResponse = await apiService.login(username, password);
                        
                        if (loginResponse.data.token) {
                            // Authentication already handled by apiService
                            window.location.href = window.location.origin + window.location.pathname + '?page=dashboard';
                        } else {
                            errorElement.textContent = loginResponse.data.message || 'Login failed';
                            errorElement.style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Login error:', error);
                        errorElement.textContent = error.message || 'Error connecting to server';
                        errorElement.style.display = 'block';
                    }
                });
                
                return;
            }
            
            // Display error message to help troubleshoot
            document.body.innerHTML = `
                <div class="error-container">
                    <h1>Error Loading Page</h1>
                    <p>There was an error loading the '${pageName}' page:</p>
                    <pre>${error.message}</pre>
                    <p><a href="./">Return to Home</a></p>
                </div>
            `;
            
            // Try to load 404 page as fallback
            try {
                const notFoundModule = await import('./pages/404.js');
                const content = await notFoundModule.default.getContent();
                const html = await renderPage(content, {
                    title: '404 - Not Found',
                    isPublic: true,
                    lang: localStorage.getItem('language') || 'ar',
                    dir: localStorage.getItem('language') === 'en' ? 'ltr' : 'rtl',
                    isArabic: (localStorage.getItem('language') || 'ar') === 'ar'
                });
                document.documentElement.innerHTML = html;
            } catch (fallbackError) {
                console.error('Failed to load 404 page:', fallbackError);
            }
        }
    } catch (error) {
        console.error('Error loading page content:', error);
        document.body.innerHTML = `
            <div class="error-container">
                <h1>Application Error</h1>
                <p>There was an error loading the application:</p>
                <pre>${error.message}</pre>
                <p>Please try refreshing the page or contact support.</p>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Language switch
    window.switchLanguage = async () => {
        const currentLang = localStorage.getItem('language') || 'ar';
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        await setLanguage(newLang);
        window.location.reload();
    };
    
    // Mobile menu toggle setup with more robust selection
    setupNavbarToggle();
    
    // Logout button
    setupLogoutButton();
}

// Handle navbar toggle logic
function setupNavbarToggle() {
    console.log('Setting up navbar toggle...');
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle && navbarMenu) {
        
        // Remove any existing event listeners (to prevent duplicates)
        navbarToggle.removeEventListener('click', toggleNavbar);
        
        // Add click event listener
        navbarToggle.addEventListener('click', toggleNavbar);
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', handleOutsideClick);
    } else {
        console.warn('Navbar elements not found in DOM yet, will retry in 500ms');
        // If elements aren't found, retry after a short delay
        setTimeout(setupNavbarToggle, 500);
    }
    
    // Toggle navbar function
    function toggleNavbar() {
        console.log('Toggling navbar');
        navbarMenu.classList.toggle('active');
        const expanded = navbarMenu.classList.contains('active');
        navbarToggle.dataset.ariaExpanded = expanded.toString();
    }
    
    // Handle clicking outside navbar
    function handleOutsideClick(event) {
        if (navbarMenu.classList.contains('active') && 
            !navbarMenu.contains(event.target) && 
            !navbarToggle.contains(event.target)) {
            navbarMenu.classList.remove('active');
            navbarToggle.dataset.ariaExpanded = "false";
        }
    }
}

// Handle logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            window.location.href = './';
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions that might be needed by other modules
export {
  setLanguage,
    loadPageContent
};
