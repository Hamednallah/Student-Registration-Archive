/**
 * 404 Not Found page module
 */

// Page configuration
const config = {
    title: '404 - Not Found',
    isPublic: true
};

/**
 * Get the page content
 * @returns {Promise<string>} HTML content
 */
async function getContent() {
    return `
        <div class="container error-container" style="min-height: calc(100vh - 180px); display: flex; align-items: center; justify-content: center;">
            <div class="error-content" style="text-align: center; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
                <h1 class="error-title" style="font-size: 3rem; margin-bottom: 20px;" data-i18n="notFoundHeading">404 - Page Not Found</h1>
                <p class="error-message" style="font-size: 1.2rem; margin-bottom: 30px;" data-i18n="notFoundMessage">The page you are looking for does not exist or has been moved.</p>
                <a href="./" class="btn-primary" style="display: inline-block; padding: 12px 30px; text-decoration: none; border-radius: 4px; background-color: var(--primary-color); color: white;" data-i18n="returnHomeButton">Return to Home</a>
            </div>
        </div>
    `;
}

/**
 * Initialize the page
 */
async function init() {
    // No special initialization needed for 404 page
}

function getTranslatedErrorMessage(message) {
    // Common error messages for translation
    const errorMessages = {
        'Page not found': '<span data-i18n="notFoundMessage">The page you are looking for does not exist or has been moved.</span>',
        'Error loading page': '<span data-i18n="itemLoadError">Error loading data</span>'
    };
    
    return errorMessages[message] || message;
}

// Export page module
export default {
    title: config.title,
    isPublic: config.isPublic,
    getContent,
    init
}; 