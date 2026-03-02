/**
 * Handles successful responses with a standardized format
 * @param {Object} res - Express response object
 * @param {any} data - Data to be returned in the response
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 * @returns {Object} Express response object
 */
const successResponse = (res, data, statusCode = 200, message = null) => {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handles error responses with a standardized format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Array|Object} errors - Validation or other specific errors
 * @param {Object} errorDetails - Additional error details (only included in development)
 * @returns {Object} Express response object
 */
const errorResponse = (res, message, statusCode = 500, errors = null, errorDetails = null) => {
  const response = {
    success: false,
    message: message,
    timestamp: new Date().toISOString()
  };

  // Include validation errors if available
  if (errors) {
    response.errors = errors;
  }

  // Include error details in non-production environments
  if (errorDetails && process.env.NODE_ENV !== 'production') {
    response.errorDetails = errorDetails;
  }

  return res.status(statusCode).json(response);
};

/**
 * Handles paginated responses with a standardized format
 * @param {Object} res - Express response object
 * @param {Array} data - The paginated data
 * @param {number} total - Total number of records
 * @param {number} page - Current page number
 * @param {number} limit - Page size limit
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 * @returns {Object} Express response object
 */
const paginationResponse = (res, data, total, page, limit, statusCode = 200, message = null) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Handles resource creation responses with a standardized format
 * @param {Object} res - Express response object
 * @param {any} data - The created resource data
 * @param {string} resourceType - Type of resource created (e.g., 'User', 'Department')
 * @param {string} message - Optional custom message
 * @returns {Object} Express response object
 */
const createdResponse = (res, data, resourceType, message = null) => {
  return successResponse(
    res, 
    data, 
    201, 
    message || `${resourceType} created successfully`
  );
};

/**
 * Handles empty success responses (like successful deletions)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @returns {Object} Express response object
 */
const noContentResponse = (res, message = 'Operation successful') => {
  return res.status(204).json({
    success: true,
    message: message,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginationResponse,
  createdResponse,
  noContentResponse
};