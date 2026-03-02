/**
 * Template Engine utility using Handlebars
 * This provides template rendering capabilities for the application
 */

// Template cache
const templateCache = new Map();
let handlebarsLoaded = false;

// Load Handlebars explicitly
async function loadHandlebars() {
    if (typeof Handlebars !== 'undefined') {
        handlebarsLoaded = true;
        initializeHelpers();
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        console.log('Loading Handlebars...');
        
        // First try loading local version
        const script = document.createElement('script');
        script.src = 'utils/handlebars.min.js';
        script.async = true;
        
        script.onload = () => {
            console.log('Handlebars loaded successfully from local file');
            handlebarsLoaded = true;
            initializeHelpers();
            resolve();
        };
        
        script.onerror = (e) => {
            console.warn('Failed to load Handlebars locally, trying CDN as fallback:', e);
            
            // Try CDN as fallback
            const cdnScript = document.createElement('script');
            cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.8/handlebars.min.js';
            cdnScript.async = true;
            
            cdnScript.onload = () => {
                console.log('Handlebars loaded successfully from CDN');
                handlebarsLoaded = true;
                initializeHelpers();
                resolve();
            };
            
            cdnScript.onerror = (cdnError) => {
                console.error('Failed to load Handlebars from all sources:', cdnError);
                reject(new Error('Failed to load Handlebars from local file and CDN'));
            };
            
            document.head.appendChild(cdnScript);
        };
        
        document.head.appendChild(script);
    });
}

// Initialize helpers
function initializeHelpers() {
    if (typeof Handlebars === 'undefined') {
        console.warn('Handlebars not available yet, deferring helper initialization');
        return;
    }

    console.log('Initializing Handlebars helpers');
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });
    
    Handlebars.registerHelper('gt', function(a, b) {
        return a > b;
    });
    
    Handlebars.registerHelper('lt', function(a, b) {
        return a < b;
    });
    
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
        return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });
    
    Handlebars.registerHelper('t', function(key) {
        const translations = JSON.parse(localStorage.getItem('translations') || '{}');
        return translations[key] || key;
    });
    
    Handlebars.registerHelper('currentYear', function() {
        return new Date().getFullYear();
    });
}

/**
 * Load a template from file
 * @param {string} path - Template file path
 * @returns {Promise<string>} Template content
 */
async function loadTemplate(path) {
    if (templateCache.has(path)) {
        return templateCache.get(path);
    }
    
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load template: ${path}`);
        
        const template = await response.text();
        templateCache.set(path, template);
        return template;
    } catch (error) {
        console.error('Error loading template:', error);
        throw error;
    }
}

/**
 * Render a template with data
 * @param {string} template - Template string
 * @param {Object} data - Data to render
 * @returns {string} Rendered HTML
 */
async function render(template, data = {}) {
    // Ensure Handlebars is loaded
    if (!handlebarsLoaded) {
        try {
            await loadHandlebars();
        } catch (error) {
            console.error('Failed to load Handlebars:', error);
            return simpleTemplateRender(template, data);
        }
    }

    // Check again after loading attempt
    if (typeof Handlebars === 'undefined') {
        console.warn('Handlebars still not available, falling back to simple rendering');
        return simpleTemplateRender(template, data);
    }

    try {
        const compiledTemplate = Handlebars.compile(template);
        return compiledTemplate(data);
    } catch (error) {
        console.error('Error rendering template:', error);
        // Fallback to simple rendering
        return simpleTemplateRender(template, data);
    }
}

/**
 * Simple template rendering as fallback when Handlebars is not available
 * @param {string} template - Template string
 * @param {Object} data - Data to render
 * @returns {string} Rendered HTML
 */
function simpleTemplateRender(template, data) {
    console.log('Using simple template rendering fallback');
    let result = template;

    // Replace {{variable}} with data
    for (const key in data) {
        if (data.hasOwnProperty(key) && typeof data[key] === 'string') {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, data[key]);
        }
    }

    // Handle {{{content}}} specially (unescaped HTML)
    if (data.content) {
        result = result.replace(/{{{content}}}/g, data.content);
    }

    return result;
}

/**
 * Render a complete page using base template
 * @param {string} content - Page content
 * @param {Object} data - Data to render
 * @returns {Promise<string>} Rendered page
 */
async function renderPage(content, data = {}) {
    try {
        // First ensure Handlebars is loaded
        if (!handlebarsLoaded) {
            try {
                await loadHandlebars();
            } catch (error) {
                console.warn('Failed to load Handlebars, will use fallback rendering');
            }
        }

        // Get current user data
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token') || '';
        const userRole = user.role || '';
        
        // Add additional flags for template rendering
        const enhancedData = {
            ...data,
            content: content,
            // Check if this is the index page
            isIndex: data.title === 'Welcome' || window.location.pathname === '/' || window.location.search.includes('page=index'),
            // User role specific flags
            isAdmin: userRole === 'A',
            // User data for display
            username: user.username || '',
            userRole: userRole,
            isAuthenticated: token !== ''
        };

        const baseTemplate = await loadTemplate('/src/templates/base.html');
        return await render(baseTemplate, enhancedData);
    } catch (error) {
        console.error('Error rendering page:', error);
        
        // Fallback to direct rendering if template loading fails
        return `
            <!DOCTYPE html>
            <html lang="${data.lang || 'en'}" dir="${data.dir || 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${data.title || 'Port Sudan Ahlia University'}</title>
                <link rel="stylesheet" href="/src/styles/styles.css">
            </head>
            <body>
                <main id="main-content">
                    ${content}
                </main>
            </body>
            </html>
        `;
    }
}

/**
 * Render a template from file and inject into container
 * @param {string} path - Template file path
 * @param {Object} data - Data to render
 * @param {HTMLElement} container - Container to inject rendered template
 * @returns {Promise<void>}
 */
async function renderTemplate(path, data = {}, container) {
    try {
        // Load template from file
        const template = await loadTemplate(path);
        
        // Render the template with data
        const rendered = await render(template, data);
        
        // Inject into container
        if (container) {
            container.innerHTML = rendered;
        }
        
        return rendered;
    } catch (error) {
        console.error(`Error rendering template from ${path}:`, error);
        throw error;
    }
}

/**
 * Render a template string with data
 * @param {string} templateString - Template string to render
 * @param {Object} data - Data to render
 * @returns {string} Rendered HTML
 */
async function renderTemplateString(templateString, data = {}) {
    try {
        return await render(templateString, data);
    } catch (error) {
        console.error('Error rendering template string:', error);
        return simpleTemplateRender(templateString, data);
    }
}

// Export functions
export {
    loadTemplate,
    render,
    renderPage,
    renderTemplate,
    renderTemplateString,
    loadHandlebars
};