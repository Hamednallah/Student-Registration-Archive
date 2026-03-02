/**
 * Utility functions for loading and managing components
 */
import { renderTemplate, renderTemplateString } from '../templateEngine.js';

// Store for translations
let currentTranslations = {};

/**
 * Set translations for use in components
 * @param {Object} translations - Translation key-value pairs
 */
function setTranslations(translations) {
    currentTranslations = translations || {};
}

/**
 * Apply translations to elements with data-i18n attribute
 * @param {HTMLElement} container - Container element to search within
 */
function applyTranslations(container) {
    if (!container) return;
    
    // Get translations from localStorage if not provided
    if (Object.keys(currentTranslations).length === 0) {
        try {
            const storedTranslations = localStorage.getItem('translations');
            if (storedTranslations) {
                currentTranslations = JSON.parse(storedTranslations);
            }
        } catch (error) {
            console.error('Error loading translations from localStorage:', error);
        }
    }
    
    // Find all elements with data-i18n attribute
    const elements = container.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = currentTranslations[key];
        
        if (translation) {
            // Handle different element types
            if (element.hasAttribute('data-i18n-attr')) {
                // Set attribute value
                const attr = element.getAttribute('data-i18n-attr');
                element.setAttribute(attr, translation);
            } else if (element.tagName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') {
                element.placeholder = translation;
            } else if (element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button'))) {
                // For button elements
                if (element.tagName === 'INPUT') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
            } else {
                // For other elements
                element.textContent = translation;
            }
        } else {
            console.warn(`Translation missing for key: ${key}`);
        }
    });
}

/**
 * Load HTML components into specified containers using templates
 * @param {Object} components - Map of component paths to container IDs
 * @returns {Promise<void>}
 */
async function loadComponents(components = {}) {
    if (!components || Object.keys(components).length === 0) return;
    
    const promises = Object.entries(components).map(async ([path, containerId]) => {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container not found for ID: ${containerId}`);
                return;
            }
            
            // Context data to pass to the template (can be extended later)
            const context = {
                user: JSON.parse(localStorage.getItem('user') || '{}'),
                isAuthenticated: localStorage.getItem('token') !== null,
                currentLanguage: localStorage.getItem('language') || 'ar',
                isArabic: (localStorage.getItem('language') || 'ar') === 'ar',
                translations: currentTranslations
            };
            
            // Render the template and inject into the container
            await renderTemplate(path, context, container);
            
            // Apply translations to the newly rendered content
            applyTranslations(container);
        } catch (error) {
            console.error(`Error loading component ${path}:`, error);
            // Add fallback content to show there was an error
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<div class="error-message">Failed to load component: ${path}</div>`;
            }
        }
    });
    
    try {
        await Promise.all(promises);
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

/**
 * Initializes common components for all pages
 */
export function initializeComponents() {
    try {
        // Apply translations to the page
        const translations = JSON.parse(localStorage.getItem('translations') || '{}');
        if (Object.keys(translations).length > 0) {
            applyTranslations(document.body);
        }
    } catch (error) {
        console.error('Error initializing components:', error);
    }
}

// Export functions
export {
    loadComponents,
    setTranslations,
    applyTranslations,
    renderTemplateString
}; 