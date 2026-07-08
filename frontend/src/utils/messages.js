/**
 * Professional User Messages
 * Centralized message definitions for consistent, user-friendly communication
 */

export const MESSAGES = {
  // Asset Management
  ASSET: {
    CREATE_SUCCESS: 'Asset registered successfully',
    CREATE_ERROR: 'Unable to register asset. Please check all required fields and try again',
    UPDATE_SUCCESS: 'Asset information updated successfully',
    UPDATE_ERROR: 'Unable to update asset information. Please try again',
    DELETE_SUCCESS: 'Asset removed from inventory',
    DELETE_ERROR: 'Unable to remove asset. Please ensure it has no active assignments',
    FETCH_ERROR: 'Unable to load asset information. Please refresh the page',
    TRANSFER_SUCCESS: 'Asset transfer completed successfully',
    TRANSFER_ERROR: 'Unable to complete transfer. Please verify all transfer details',
    EXPORT_SUCCESS: 'Asset data exported successfully',
    EXPORT_ERROR: 'Unable to export data. Please try again',
  },

  // Maintenance
  MAINTENANCE: {
    REQUEST_SUCCESS: 'Maintenance request submitted successfully',
    REQUEST_ERROR: 'Unable to submit maintenance request. Please check all fields',
    UPDATE_SUCCESS: 'Maintenance request updated successfully',
    UPDATE_ERROR: 'Unable to update maintenance request. Please try again',
    ASSIGN_SUCCESS: 'Technician assigned successfully',
    ASSIGN_ERROR: 'Unable to assign technician. Please try again',
    COMPLETE_SUCCESS: 'Work order completed successfully',
    COMPLETE_ERROR: 'Unable to complete work order. Please ensure all required fields are filled',
    FETCH_ERROR: 'Unable to load maintenance requests. Please refresh the page',
  },

  // Reports
  REPORT: {
    GENERATE_SUCCESS: 'Report generated successfully',
    GENERATE_ERROR: 'Unable to generate report. Please check your parameters and try again',
    EXPORT_CSV_SUCCESS: 'Report exported to CSV successfully',
    EXPORT_EXCEL_SUCCESS: 'Report exported to Excel successfully',
    EXPORT_PDF_SUCCESS: 'Report exported to PDF successfully',
    EXPORT_ERROR: 'Unable to export report. Please try again',
    SCHEDULE_SUCCESS: 'Report scheduled successfully',
    SCHEDULE_ERROR: 'Unable to schedule report. Please verify the schedule settings',
    AUTHORIZE_SUCCESS: 'Report authorized successfully',
    AUTHORIZE_ERROR: 'Unable to authorize report. Please try again',
    SEND_SUCCESS: 'Report sent to recipients successfully',
    SEND_ERROR: 'Unable to send report. Please check recipient list',
  },

  // User Management
  USER: {
    CREATE_SUCCESS: 'User account created successfully',
    CREATE_ERROR: 'Unable to create user account. Please check all required fields',
    UPDATE_SUCCESS: 'User information updated successfully',
    UPDATE_ERROR: 'Unable to update user information. Please try again',
    DELETE_SUCCESS: 'User account removed successfully',
    DELETE_ERROR: 'Unable to remove user account. Please try again',
    ACTIVATE_SUCCESS: 'User account activated successfully',
    DEACTIVATE_SUCCESS: 'User account deactivated successfully',
    PASSWORD_RESET_SUCCESS: 'Password reset email sent successfully',
    PASSWORD_RESET_ERROR: 'Unable to send password reset email. Please try again',
    FETCH_ERROR: 'Unable to load user information. Please refresh the page',
  },

  // Authentication
  AUTH: {
    LOGIN_SUCCESS: 'Welcome back! Login successful',
    LOGIN_ERROR: 'Invalid credentials. Please check your username and password',
    LOGOUT_SUCCESS: 'Logged out successfully',
    SESSION_EXPIRED: 'Your session has expired. Please log in again',
    UNAUTHORIZED: 'You do not have permission to perform this action',
  },

  // Forms & Validation
  FORM: {
    REQUIRED_FIELDS: 'Please fill in all required fields',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_DATE: 'Please select a valid date',
    INVALID_NUMBER: 'Please enter a valid number',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit',
    INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format',
    SAVE_SUCCESS: 'Changes saved successfully',
    SAVE_ERROR: 'Unable to save changes. Please try again',
  },

  // Budget & Financial
  BUDGET: {
    CREATE_SUCCESS: 'Budget allocation created successfully',
    CREATE_ERROR: 'Unable to create budget allocation. Please check all fields',
    UPDATE_SUCCESS: 'Budget information updated successfully',
    UPDATE_ERROR: 'Unable to update budget information. Please try again',
    INSUFFICIENT_FUNDS: 'Insufficient budget available for this operation',
    FETCH_ERROR: 'Unable to load budget information. Please refresh the page',
  },

  // Checkout & Assignment
  CHECKOUT: {
    SUCCESS: 'Asset checked out successfully',
    ERROR: 'Unable to check out asset. Please verify availability',
    RETURN_SUCCESS: 'Asset returned successfully',
    RETURN_ERROR: 'Unable to process return. Please try again',
    EXTEND_SUCCESS: 'Checkout period extended successfully',
    EXTEND_ERROR: 'Unable to extend checkout period. Please try again',
    OVERDUE: 'This asset is overdue. Please return it as soon as possible',
  },

  // Assignment System
  ASSIGNMENT: {
    REQUEST_SUCCESS: 'Assignment request submitted successfully',
    REQUEST_ERROR: 'Unable to submit assignment request. Please check all fields',
    APPROVE_SUCCESS: 'Assignment request approved successfully',
    APPROVE_ERROR: 'Unable to approve assignment request. Please try again',
    REJECT_SUCCESS: 'Assignment request rejected',
    REJECT_ERROR: 'Unable to reject assignment request. Please try again',
    COMPLETE_SUCCESS: 'Assignment completed successfully',
    COMPLETE_ERROR: 'Unable to complete assignment. Please try again',
    EXTEND_SUCCESS: 'Assignment extension approved successfully',
    EXTEND_ERROR: 'Unable to approve extension. Please try again',
    WAITLIST_SUCCESS: 'Added to waitlist successfully',
    WAITLIST_ERROR: 'Unable to add to waitlist. Please try again',
  },

  // Documents & Files
  DOCUMENT: {
    UPLOAD_SUCCESS: 'Document uploaded successfully',
    UPLOAD_ERROR: 'Unable to upload document. Please check file size and format',
    DELETE_SUCCESS: 'Document deleted successfully',
    DELETE_ERROR: 'Unable to delete document. Please try again',
    DOWNLOAD_SUCCESS: 'Document downloaded successfully',
    DOWNLOAD_ERROR: 'Unable to download document. Please try again',
  },

  // Notifications
  NOTIFICATION: {
    MARK_READ_SUCCESS: 'Notification marked as read',
    MARK_READ_ERROR: 'Unable to mark notification as read',
    DELETE_SUCCESS: 'Notification deleted successfully',
    DELETE_ERROR: 'Unable to delete notification',
    FETCH_ERROR: 'Unable to load notifications. Please refresh',
  },

  // System Settings
  SETTINGS: {
    UPDATE_SUCCESS: 'Settings updated successfully',
    UPDATE_ERROR: 'Unable to update settings. Please try again',
    RESET_SUCCESS: 'Settings reset to default values',
    RESET_ERROR: 'Unable to reset settings. Please try again',
  },

  // Backup & Restore
  BACKUP: {
    CREATE_SUCCESS: 'Backup created successfully',
    CREATE_ERROR: 'Unable to create backup. Please try again',
    RESTORE_SUCCESS: 'System restored from backup successfully',
    RESTORE_ERROR: 'Unable to restore from backup. Please try again',
    DELETE_SUCCESS: 'Backup deleted successfully',
    DELETE_ERROR: 'Unable to delete backup. Please try again',
  },

  // General
  GENERAL: {
    LOADING: 'Loading, please wait...',
    PROCESSING: 'Processing your request...',
    SUCCESS: 'Operation completed successfully',
    ERROR: 'An error occurred. Please try again',
    NETWORK_ERROR: 'Network connection error. Please check your internet connection',
    SERVER_ERROR: 'Server error. Please try again later or contact support',
    NOT_FOUND: 'The requested resource was not found',
    CONFIRM_DELETE: 'Are you sure you want to delete this item? This action cannot be undone',
    CONFIRM_ACTION: 'Are you sure you want to proceed with this action?',
    NO_DATA: 'No data available',
    REFRESH_SUCCESS: 'Data refreshed successfully',
    REFRESH_ERROR: 'Unable to refresh data. Please try again',
  },

  // Disposal
  DISPOSAL: {
    REQUEST_SUCCESS: 'Disposal request submitted successfully',
    REQUEST_ERROR: 'Unable to submit disposal request. Please check all fields',
    APPROVE_SUCCESS: 'Disposal request approved successfully',
    APPROVE_ERROR: 'Unable to approve disposal request. Please try again',
    REJECT_SUCCESS: 'Disposal request rejected',
    REJECT_ERROR: 'Unable to reject disposal request. Please try again',
  },

  // Verification
  VERIFICATION: {
    SUBMIT_SUCCESS: 'Verification submitted successfully',
    SUBMIT_ERROR: 'Unable to submit verification. Please try again',
    RESOLVE_SUCCESS: 'Discrepancy resolved successfully',
    RESOLVE_ERROR: 'Unable to resolve discrepancy. Please try again',
  },

  // QR Code
  QR: {
    GENERATE_SUCCESS: 'QR code generated successfully',
    GENERATE_ERROR: 'Unable to generate QR code. Please try again',
    SCAN_SUCCESS: 'QR code scanned successfully',
    SCAN_ERROR: 'Unable to scan QR code. Please try again',
    INVALID_CODE: 'Invalid QR code. Please scan a valid asset QR code',
  },

  // Feedback
  FEEDBACK: {
    SUBMIT_SUCCESS: 'Thank you for your feedback! Your input has been recorded',
    SUBMIT_ERROR: 'Unable to submit feedback. Please try again',
    RATING_SUCCESS: 'Thank you for rating our service',
    RATING_ERROR: 'Unable to submit rating. Please try again',
  },
}

/**
 * Format error message from API response
 * @param {Error|Object} error - Error object from API
 * @returns {string} - User-friendly error message
 */
export const formatErrorMessage = (error) => {
  // Network error
  if (!error.response) {
    return MESSAGES.GENERAL.NETWORK_ERROR
  }

  // Server error (500+)
  if (error.response.status >= 500) {
    return MESSAGES.GENERAL.SERVER_ERROR
  }

  // Unauthorized (401)
  if (error.response.status === 401) {
    return MESSAGES.AUTH.SESSION_EXPIRED
  }

  // Forbidden (403)
  if (error.response.status === 403) {
    return MESSAGES.AUTH.UNAUTHORIZED
  }

  // Not found (404)
  if (error.response.status === 404) {
    return MESSAGES.GENERAL.NOT_FOUND
  }

  // Extract error message from response
  const data = error.response.data
  
  if (typeof data === 'string') {
    return data
  }

  if (data.error) {
    return data.error
  }

  if (data.detail) {
    return data.detail
  }

  if (data.message) {
    return data.message
  }

  // Handle validation errors
  if (data.errors && typeof data.errors === 'object') {
    const firstError = Object.values(data.errors)[0]
    if (Array.isArray(firstError)) {
      return firstError[0]
    }
    return firstError
  }

  // Default error message
  return MESSAGES.GENERAL.ERROR
}

/**
 * Get success message for an operation
 * @param {string} category - Message category (e.g., 'ASSET', 'MAINTENANCE')
 * @param {string} action - Action type (e.g., 'CREATE_SUCCESS', 'UPDATE_SUCCESS')
 * @returns {string} - Success message
 */
export const getSuccessMessage = (category, action) => {
  return MESSAGES[category]?.[action] || MESSAGES.GENERAL.SUCCESS
}

/**
 * Get error message for an operation
 * @param {string} category - Message category (e.g., 'ASSET', 'MAINTENANCE')
 * @param {string} action - Action type (e.g., 'CREATE_ERROR', 'UPDATE_ERROR')
 * @returns {string} - Error message
 */
export const getErrorMessage = (category, action) => {
  return MESSAGES[category]?.[action] || MESSAGES.GENERAL.ERROR
}

export default MESSAGES
