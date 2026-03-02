/**
 * Utility to check for missing translations
 * 
 * This script can be included or run in the console to find missing translations
 * in both language files.
 */

async function checkTranslations() {
  try {
    // Load both language files
    const [enResponse, arResponse] = await Promise.all([
      fetch('/lang/en.json'),
      fetch('/lang/ar.json')
    ]);
    
    if (!enResponse.ok || !arResponse.ok) {
      throw new Error('Failed to load language files');
    }
    
    const [enTranslations, arTranslations] = await Promise.all([
      enResponse.json(),
      arResponse.json()
    ]);
    
    // Get all elements with data-i18n attribute
    const elementsWithI18n = document.querySelectorAll('[data-i18n]');
    
    // Check for missing translations
    const missingEn = [];
    const missingAr = [];
    
    elementsWithI18n.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (!enTranslations[key]) {
        missingEn.push(key);
      }
      if (!arTranslations[key]) {
        missingAr.push(key);
      }
    });
    
    // Report missing translations
    if (missingEn.length > 0) {
      console.warn('Missing English translations:', missingEn);
    } else {
      console.log('All English translations found!');
    }
    
    if (missingAr.length > 0) {
      console.warn('Missing Arabic translations:', missingAr);
    } else {
      console.log('All Arabic translations found!');
    }
    
    // Check for keys in one language but not the other
    const enKeys = Object.keys(enTranslations);
    const arKeys = Object.keys(arTranslations);
    
    const inEnNotAr = enKeys.filter(key => !arKeys.includes(key));
    const inArNotEn = arKeys.filter(key => !enKeys.includes(key));
    
    if (inEnNotAr.length > 0) {
      console.warn('Keys in English but not in Arabic:', inEnNotAr);
    }
    
    if (inArNotEn.length > 0) {
      console.warn('Keys in Arabic but not in English:', inArNotEn);
    }
    
    return {
      missingEn,
      missingAr,
      inEnNotAr,
      inArNotEn
    };
  } catch (error) {
    console.error('Error checking translations:', error);
    return null;
  }
}

// This can be run directly in the console with:
// checkTranslations().then(result => console.log('Translation check complete', result));

export { checkTranslations };