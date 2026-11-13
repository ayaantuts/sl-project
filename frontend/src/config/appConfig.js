export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

// Frontend business-rule constants.
export const REJOIN_LIMIT = 2;
export const SLOT_MINUTES = 30;
export const CHECK_IN_EARLY_MINUTES = 15;
export const DEFAULT_SAFE_DISTANCE = 3;
export const COUNTERS_PER_SERVICE = 1;
export const TARGET_WAIT_MINUTES = 20;

export const ROLES = Object.freeze({ USER: 'User', MODERATOR: 'Moderator', ADMIN: 'Admin' });

export const STORAGE_KEYS = Object.freeze({
  authToken: 'waitless.authToken',
  preferences: 'waitless.preferences',
  console: 'waitless.consoleSelection',
});
