// API Service for handling all API requests https://l9hcq09q-5000.euw.devtunnels.ms/
const API_BASE_URL = 'http://localhost:5000/api';

// Cache for auth token to reduce localStorage access
let authTokenCache = null;

// Get the authentication token from cache or localStorage
function getAuthToken() {
  if (authTokenCache) return authTokenCache;
  
  const token = localStorage.getItem('token');
  authTokenCache = token;
  return token;
}

// Handle API responses
function handleResponse(response) {
  return response.text()
    .then(text => {
      // Try to parse as JSON if possible
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        throw new Error('Invalid JSON response from server');
      }

      if(response.status === 401){
        console.log('Unauthorized access detected, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return {};
      }
      
      // Special handling for conflict status
      if (response.status === 409) {
        const data = text ? JSON.parse(text) : {};
        let fallbackMessage = 'Conflict detected';
        
        // Determine context-specific fallback message
        if (response.url.includes('/students')) {
          fallbackMessage = 'Student ID already exists';
        } else if (response.url.includes('/departments')) {
          fallbackMessage = 'Cannot delete - referenced by other records';
        }

        return Promise.resolve({
          status: response.status,
          data: {
            ...data,
            error: data.error || fallbackMessage
          }
        });
      }
      
      if (response.status >= 400) {
        console.log('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
      }
      
      if (!response.ok) {
        // Format error message
        const error = data.error || data.message || 'Unknown error occurred';
        throw new Error(error);
      }
      return data;
    })
    .catch(error => {
      // Add more context to the error
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from server');
      }
      throw error;
    });
}

// API Service object with methods for different HTTP requests
const apiService = {
  // Login method
  login: async (username, password) => {
    try {
      // Regular login request
      let req = null;
      const response = await fetch(`${API_BASE_URL}/login`, req = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        //mode: 'no-cors'
      });

      
      const loginResponse = await handleResponse(response);
      
      if (loginResponse.data.token) {
        localStorage.setItem('token', loginResponse.data.token);
        authTokenCache = loginResponse.data.token;
        
        if (loginResponse.data.user) {
          const user = {
            ...loginResponse.data.user,
            role: loginResponse.data.user.role.toUpperCase()
          };
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      
      return loginResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout method
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authTokenCache = null;
    
    // Call logout endpoint to invalidate server-side session
    return fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
      //mode: 'no-cors'
    }).catch(error => {
      console.error('Logout error:', error);
    });
  },
  
  // GET request
  get: async (endpoint, query) => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
        query: JSON.stringify(query),
        //mode: 'no-cors'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error(`GET error for ${endpoint}:`, error);
      throw error;
    }
  },
  
  // POST request
  post: async (endpoint, data) => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include',
        //mode: 'no-cors'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error(`POST error for ${endpoint}:`, error);
      throw error;
    }
  },
  
  // PUT request
  put: async (endpoint, data) => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        credentials: 'include',
        //mode: 'no-cors'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error(`PUT error for ${endpoint}:`, error);
      throw error;
    }
  },
  
  // DELETE request
  delete: async (endpoint) => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        //mode: 'no-cors'
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error(`DELETE error for ${endpoint}:`, error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },
  
  // Get current user
  getCurrentUser: () => {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }
};

// Export as both named and default export
export { apiService };
export default apiService;
