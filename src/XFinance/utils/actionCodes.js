/**
 * Action Code Constants and Utilities
 * Centralized action codes for the entire application
 */

export const ACTION_CODES = {
  // Dashboard & Navigation - 100 series
  VIEW_DASHBOARD: 101,
  VIEW_ADMIN_PAGE: 102,
  VIEW_SETTINGS_PAGE: 103,

  // User Management - 200 series
  VIEW_USERS: 201,
  CREATE_USER: 202,
  EDIT_USER: 203,
  DELETE_USER: 204,
  RESET_USER_PASSWORD: 205,
  MANAGE_USER_ROLES: 206,
  MANAGE_USER_GROUPS: 207,

  // Role Management - 300 series
  VIEW_ROLES: 301,
  CREATE_ROLE: 302,
  EDIT_ROLE: 303,
  DELETE_ROLE: 304,
  ASSIGN_ROLE_ACTIONS: 305,

  // Group Management - 400 series
  VIEW_GROUPS: 401,
  CREATE_GROUP: 402,
  EDIT_GROUP: 403,
  DELETE_GROUP: 404,
  MANAGE_GROUP_MEMBERS: 405,

  // Account Management - 500 series
  VIEW_ACCOUNTS: 501,
  CREATE_ACCOUNT: 502,
  EDIT_ACCOUNT: 503,
  DELETE_ACCOUNT: 504,

  // Customer Management - 600 series
  VIEW_CUSTOMERS: 601,
  CREATE_CUSTOMER: 602,
  EDIT_CUSTOMER: 603,
  DELETE_CUSTOMER: 604,

  // Transaction Management - 700 series
  VIEW_TRANSACTIONS: 701,
  CREATE_TRANSACTION: 702,
  EDIT_TRANSACTION: 703,
  DELETE_TRANSACTION: 704,
  SUBMIT_TRANSACTION: 705,
  APPROVE_TRANSACTION: 706,
  REJECT_TRANSACTION: 707,

  // Report Management - 800 series
  VIEW_REPORTS: 801,
  GENERATE_REPORT: 802,
  EXPORT_REPORT: 803,
  PRINT_REPORT: 804,

  // Settings & Configuration - 900 series
  VIEW_SETTINGS: 901,
  EDIT_SETTINGS: 902,
  MANAGE_COMPANY: 903,
  MANAGE_PERMISSIONS: 904,

  // OCR & AI Features - 1000 series
  USE_OCR: 1001,
  USE_AI_ANALYSIS: 1002,

  // Export & Import - 1100 series
  EXPORT_DATA: 1101,
  IMPORT_DATA: 1102,
  BACKUP_DATA: 1103,

  // Audit & Logs - 1200 series
  VIEW_AUDIT_LOGS: 1201,
  VIEW_ERROR_LOGS: 1202,
};

/**
 * Check if user has specific action
 * @param {Function} hasAction - hasAction function from AppContext
 * @param {number} actionCode - Action code to check
 * @returns {boolean} True if user has the action
 */
export const checkAction = (hasAction, actionCode) => {
  return hasAction && hasAction(actionCode);
};

/**
 * Get multiple action codes
 * @param {...number} codes - Action codes to check
 * @returns {Array} Array of action codes
 */
export const getActionCodes = (...codes) => codes;
