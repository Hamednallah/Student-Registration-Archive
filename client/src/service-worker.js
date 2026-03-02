/**
 * Service Worker for offline functionality
 * This provides caching for important application assets
 */

const CACHE_NAME = 'psac-cache-v1';
const APP_ORIGIN = self.location.origin;

// List of assets to pre-cache (only from our own domain)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  //'/src/styles/styles.css',
  '/src/styles/modules/variables.css',
  '/src/styles/modules/base.css',
  '/src/styles/modules/layout.css',
  '/src/styles/modules/navigation.css',
  '/src/styles/modules/components.css',
  '/src/styles/modules/forms.css',
  '/src/styles/modules/tables.css',
  '/src/styles/modules/dashboard.css',
  '/src/styles/modules/rtl.css',
  '/src/styles/modules/responsive.css',
  '/src/styles/modules/utilities.css',
  '/src/styles/modules/animations.css',
  '/src/styles/modules/print.css',
  '/src/assets/logo.png',
  '/src/assets/hero-bg.jpg',
  '/src/manifest.json'
  // Removed potentially problematic resources
  // '/src/templates/base.html',
  // '/src/utils/templateEngine.js',
  // '/src/utils/components/components.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        // Cache files individually to prevent failure if one file is missing
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Service Worker installation failed:', error);
        // Continue with service worker installation even if caching fails
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
    .then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('Service Worker activation error:', error);
    })
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Skip chrome-extension requests which can cause problems
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // For API requests, use network first, then cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to use it and store it
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clonedResponse))
            .catch(error => {
              console.warn('Failed to cache API response:', error);
            });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // For other requests, use cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return from cache if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Don't cache if it's not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Clone the response to use it and store it
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
                  .catch(error => {
                    console.warn(`Failed to cache ${event.request.url}:`, error);
                  });
              })
              .catch(error => {
                console.warn('Failed to open cache:', error);
              });
            
            return fetchResponse;
          })
          .catch(error => {
            console.error('Service Worker fetch error:', error);
            
            // For HTML navigation requests, return the offline page
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match('/src/');
            }
            
            return new Response('Network error occurred', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
      .catch(error => {
        console.error('Service Worker cache match error:', error);
        return fetch(event.request);
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 