/**
 * File Purpose: Centralized error handling service
 * Last Updated: July 30, 2026
 * Usage: Import and use in API calls and error boundaries
 */

export interface ApiError {
  message: string;
  code?: string | number;
  status?: number;
  details?: Record<string, any>;
}

/**
 * Parse API errors and provide user-friendly messages
 */
export const errorHandler = {
  /**
   * Get user-friendly error message
   */
  getMessage: (error: any): string => {
    if (!error) return 'An unexpected error occurred';

    // Check for custom error message
    if (error.message) return error.message;

    // Check for response data
    if (error.response?.data?.message) return error.response.data.message;

    // Check for status code
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'You are not authenticated. Please log in.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This action conflicts with existing data.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service unavailable. Please try again later.';
        default:
          return `Error ${error.response.status}: Please try again.`;
      }
    }

    return 'An error occurred. Please try again.';
  },

  /**
   * Get error code for support reference
   */
  getCode: (error: any): string => {
    if (error.code) return error.code;
    if (error.response?.data?.code) return error.response.data.code;
    if (error.response?.status) return `HTTP_${error.response.status}`;
    return 'UNKNOWN_ERROR';
  },

  /**
   * Get detailed description for inline display
   */
  getDescription: (error: any): string | undefined => {
    if (error.description) return error.description;
    if (error.response?.data?.description) return error.response.data.description;
    if (error.response?.data?.details) return JSON.stringify(error.response.data.details);
    return undefined;
  },

  /**
   * Get validation errors for forms
   */
  getValidationErrors: (error: any): Record<string, string> => {
    if (error.response?.data?.errors) {
      return error.response.data.errors;
    }
    return {};
  },

  /**
   * Determine if error is retriable
   */
  isRetriable: (error: any): boolean => {
    if (!error.response) return true; // Network error, likely retriable
    const status = error.response.status;
    return (
      status === 408 || // Request timeout
      status === 429 || // Too many requests
      (status >= 500 && status < 600) // Server errors
    );
  },

  /**
   * Log error for debugging
   */
  log: (error: any, context?: string): void => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error(`[Error${context ? ` - ${context}` : ''}]`, {
        message: errorHandler.getMessage(error),
        code: errorHandler.getCode(error),
        details: error,
      });
    }
  },

  /**
   * Create structured error object
   */
  format: (error: any): ApiError => {
    return {
      message: errorHandler.getMessage(error),
      code: errorHandler.getCode(error),
      status: error.response?.status,
      details: errorHandler.getValidationErrors(error),
    };
  },
};

/**
 * Hook-like function to handle API errors in React components
 */
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    errorHandler.log(error, context);
    return errorHandler.format(error);
  };

  return { handleError, ...errorHandler };
};

export default errorHandler;
